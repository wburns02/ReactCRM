#!/usr/bin/env python3
"""
Background job worker for RingCentral call processing automation.
Processes transcription, analysis, and disposition jobs from the Redis queue.

Usage:
    python worker.py [--worker-id WORKER_ID] [--concurrency N]

Examples:
    python worker.py                           # Single worker with default ID
    python worker.py --worker-id worker_2      # Named worker
    python worker.py --concurrency 3          # Process 3 jobs concurrently
"""

import asyncio
import argparse
import signal
import sys
import logging
import time
from typing import Optional

from app.core.config import settings
from app.services.background_jobs import background_job_manager

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


class WorkerManager:
    """Manages background job worker processes."""

    def __init__(self, worker_id: str, concurrency: int = 1):
        """
        Initialize worker manager.

        Args:
            worker_id: Unique identifier for this worker
            concurrency: Number of jobs to process concurrently
        """
        self.worker_id = worker_id
        self.concurrency = concurrency
        self.running = False
        self.tasks = []

    async def start(self):
        """Start the worker manager."""
        self.running = True
        logger.info(f"Starting worker {self.worker_id} with concurrency {self.concurrency}")

        try:
            # Start concurrent worker tasks
            for i in range(self.concurrency):
                task_id = f"{self.worker_id}_task_{i}"
                task = asyncio.create_task(self._worker_loop(task_id))
                self.tasks.append(task)

            # Wait for all tasks to complete
            await asyncio.gather(*self.tasks)

        except KeyboardInterrupt:
            logger.info(f"Worker {self.worker_id} received shutdown signal")
            await self.stop()
        except Exception as e:
            logger.error(f"Worker {self.worker_id} error: {e}")
            await self.stop()

    async def stop(self):
        """Stop the worker manager gracefully."""
        self.running = False
        logger.info(f"Stopping worker {self.worker_id}...")

        # Cancel all running tasks
        for task in self.tasks:
            if not task.done():
                task.cancel()

        # Wait for tasks to finish cancellation
        if self.tasks:
            await asyncio.gather(*self.tasks, return_exceptions=True)

        logger.info(f"Worker {self.worker_id} stopped")

    async def _worker_loop(self, task_id: str):
        """Main worker loop for processing jobs."""
        logger.info(f"Starting worker task {task_id}")

        while self.running:
            try:
                # Process jobs using the background job manager
                await background_job_manager.process_jobs(
                    worker_id=task_id,
                    batch_size=1
                )

            except asyncio.CancelledError:
                logger.info(f"Worker task {task_id} cancelled")
                break
            except Exception as e:
                logger.error(f"Worker task {task_id} error: {e}")
                # Wait before retrying to avoid rapid error loops
                await asyncio.sleep(5)

        logger.info(f"Worker task {task_id} finished")


def setup_signal_handlers(worker_manager: WorkerManager):
    """Setup signal handlers for graceful shutdown."""
    def signal_handler(sig, frame):
        logger.info(f"Received signal {sig}, shutting down gracefully...")
        asyncio.create_task(worker_manager.stop())

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)


async def health_monitor(worker_manager: WorkerManager):
    """Monitor worker health and report statistics."""
    logger.info("Starting health monitor")

    while worker_manager.running:
        try:
            # Get queue statistics
            stats = await background_job_manager.get_queue_stats()

            logger.info(
                f"Queue Stats - Length: {stats['queue_length']}, "
                f"Delayed: {stats['delayed_jobs']}, "
                f"Total Jobs: {stats['total_jobs']}"
            )

            # Log status breakdown if available
            status_breakdown = stats.get('status_breakdown', {})
            if status_breakdown:
                status_summary = ", ".join([
                    f"{status}: {count}"
                    for status, count in status_breakdown.items()
                    if count > 0
                ])
                if status_summary:
                    logger.info(f"Job Status - {status_summary}")

            # Wait before next check
            await asyncio.sleep(60)  # Report every minute

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Health monitor error: {e}")
            await asyncio.sleep(60)

    logger.info("Health monitor stopped")


async def main():
    """Main worker entry point."""
    parser = argparse.ArgumentParser(description='RingCentral call processing worker')
    parser.add_argument(
        '--worker-id',
        default=f'worker_{int(time.time())}',
        help='Unique worker identifier'
    )
    parser.add_argument(
        '--concurrency',
        type=int,
        default=1,
        help='Number of jobs to process concurrently'
    )
    parser.add_argument(
        '--monitor',
        action='store_true',
        help='Enable health monitoring and statistics'
    )
    parser.add_argument(
        '--test-connection',
        action='store_true',
        help='Test Redis connection and exit'
    )

    args = parser.parse_args()

    # Test connection mode
    if args.test_connection:
        try:
            stats = await background_job_manager.get_queue_stats()
            logger.info("Redis connection successful!")
            logger.info(f"Queue stats: {stats}")
            return 0
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            return 1

    # Create worker manager
    worker_manager = WorkerManager(
        worker_id=args.worker_id,
        concurrency=args.concurrency
    )

    # Setup signal handlers
    setup_signal_handlers(worker_manager)

    # Start health monitor if requested
    monitor_task = None
    if args.monitor:
        monitor_task = asyncio.create_task(health_monitor(worker_manager))

    try:
        # Start the worker
        await worker_manager.start()

    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    except Exception as e:
        logger.error(f"Worker failed: {e}")
        return 1
    finally:
        # Cleanup
        if monitor_task:
            monitor_task.cancel()
            try:
                await monitor_task
            except asyncio.CancelledError:
                pass

    return 0


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except Exception as e:
        logger.error(f"Worker startup failed: {e}")
        sys.exit(1)