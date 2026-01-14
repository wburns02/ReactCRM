/**
 * End-to-end tests for RingCentral call automation pipeline.
 * Tests the complete "AUTOMATION ALL THE WAY" workflow from webhook to auto-disposition.
 */

import { test, expect, Page } from '@playwright/test';

// Test data and helpers
const TEST_CALL_DATA = {
  sessionId: 'test_session_12345',
  callId: 'rc_call_67890',
  accountId: 'test_account_123',
  extensionId: 'test_ext_456',
  duration: 180, // 3 minutes
  fromNumber: '+1234567890',
  toNumber: '+0987654321',
  direction: 'inbound' as const,
  status: 'Completed' as const
};

const WEBHOOK_EVENTS = {
  callEnded: {
    uuid: 'webhook_uuid_123',
    event: '/restapi/v1.0/account/~/extension/~/telephony/sessions',
    timestamp: Date.now(),
    subscriptionId: 'test_subscription_123',
    body: {
      telephonySessionId: TEST_CALL_DATA.sessionId,
      accountId: TEST_CALL_DATA.accountId,
      extensionId: TEST_CALL_DATA.extensionId,
      eventType: 'CallEnded',
      hasRecording: true,
      recordingUrl: 'https://test-recording-url.com/recording.mp3'
    }
  },
  recordingReady: {
    uuid: 'webhook_uuid_456',
    event: '/restapi/v1.0/account/~/extension/~/recording',
    timestamp: Date.now(),
    subscriptionId: 'test_subscription_456',
    body: {
      telephonySessionId: TEST_CALL_DATA.sessionId,
      recordingId: 'test_recording_123',
      recordingUrl: 'https://test-recording-url.com/recording.mp3'
    }
  }
};

const MOCK_ANALYSIS_RESULTS = {
  highConfidence: {
    overall_sentiment: 'positive',
    sentiment_score: 85,
    overall_quality_score: 90,
    escalation_risk: 'low',
    predicted_disposition: 'Resolved - Customer Satisfied',
    disposition_confidence: 92
  },
  mediumConfidence: {
    overall_sentiment: 'neutral',
    sentiment_score: 5,
    overall_quality_score: 75,
    escalation_risk: 'medium',
    predicted_disposition: 'Follow-up Required',
    disposition_confidence: 68
  },
  lowConfidence: {
    overall_sentiment: 'negative',
    sentiment_score: -25,
    overall_quality_score: 45,
    escalation_risk: 'high',
    predicted_disposition: 'Customer Complaint',
    disposition_confidence: 45
  }
};

class AutomationTestHelper {
  constructor(private page: Page) {}

  async setupTestData() {
    // Create test user and RingCentral account
    await this.page.evaluate(() => {
      // This would typically involve API calls to set up test data
      window.testData = {
        userId: 'test_user_123',
        rcAccount: {
          id: 'rc_account_123',
          accountId: TEST_CALL_DATA.accountId,
          extensionId: TEST_CALL_DATA.extensionId
        }
      };
    });
  }

  async sendWebhook(webhookData: any) {
    // Send webhook to the test endpoint
    const response = await this.page.request.post('/api/v2/webhooks/ringcentral/test', {
      data: webhookData
    });
    return response;
  }

  async waitForJobCompletion(jobId: string, timeout = 30000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const response = await this.page.request.get(`/api/v2/jobs/status/${jobId}`);
      const status = await response.json();

      if (status.status === 'completed') {
        return status;
      } else if (status.status === 'failed') {
        throw new Error(`Job ${jobId} failed: ${status.error}`);
      }

      await this.page.waitForTimeout(1000);
    }

    throw new Error(`Job ${jobId} did not complete within ${timeout}ms`);
  }

  async getCallLogBySessionId(sessionId: string) {
    const response = await this.page.request.get(`/api/v2/ringcentral/calls?session_id=${sessionId}`);
    const data = await response.json();
    return data.calls?.find((call: any) => call.rc_session_id === sessionId);
  }

  async mockTranscriptionService(transcriptText: string) {
    // Mock the transcription service to return predictable results
    await this.page.addInitScript((transcript) => {
      window.mockTranscription = transcript;
    }, transcriptText);
  }

  async mockAnalysisService(analysisResults: any) {
    // Mock the analysis service to return specific results
    await this.page.addInitScript((results) => {
      window.mockAnalysis = results;
    }, analysisResults);
  }
}

test.describe('RingCentral Automation Pipeline', () => {
  let helper: AutomationTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AutomationTestHelper(page);
    await helper.setupTestData();

    // Navigate to the dashboard
    await page.goto('/');
    await expect(page).toHaveTitle(/CRM/);
  });

  test('should auto-apply disposition with high confidence', async ({ page }) => {
    // Mock high-confidence analysis
    await helper.mockTranscriptionService(
      "Thank you for calling HVAC Services. I was able to resolve your heating issue completely. " +
      "The technician will arrive tomorrow as scheduled. Is there anything else I can help you with? " +
      "Great, have a wonderful day!"
    );
    await helper.mockAnalysisService(MOCK_ANALYSIS_RESULTS.highConfidence);

    // Send webhook for call ended
    const webhookResponse = await helper.sendWebhook(WEBHOOK_EVENTS.callEnded);
    expect(webhookResponse.ok()).toBeTruthy();

    const webhookResult = await webhookResponse.json();
    console.log('Webhook response:', webhookResult);

    // Verify webhook was processed
    expect(webhookResult.status).toBe('received');
    expect(webhookResult.queued_for_processing).toBe(true);

    // Wait for processing to complete
    await page.waitForTimeout(5000); // Allow time for background processing

    // Check call log was created and disposition was auto-applied
    const callLog = await helper.getCallLogBySessionId(TEST_CALL_DATA.sessionId);
    expect(callLog).toBeTruthy();
    expect(callLog.disposition_status).toBe('auto_applied');
    expect(callLog.disposition_applied_by).toBe('auto_applied');
    expect(callLog.disposition_confidence).toBeGreaterThan(75);

    // Verify in UI
    await page.goto('/calls');

    // Look for the call in the call list
    await page.waitForSelector('[data-testid="call-list"]');
    const callRow = page.locator(`[data-call-id="${TEST_CALL_DATA.callId}"]`);
    await expect(callRow).toBeVisible();

    // Check disposition badge
    const dispositionBadge = callRow.locator('[data-testid="disposition-badge"]');
    await expect(dispositionBadge).toContainText('Resolved - Customer Satisfied');
    await expect(dispositionBadge).toHaveClass(/bg-green/); // Positive disposition
  });

  test('should suggest disposition with medium confidence', async ({ page }) => {
    // Mock medium-confidence analysis
    await helper.mockTranscriptionService(
      "Hi, I'm calling about my HVAC service appointment. I need to reschedule for next week. " +
      "Can you check availability? Also, I have some questions about the maintenance plan."
    );
    await helper.mockAnalysisService(MOCK_ANALYSIS_RESULTS.mediumConfidence);

    // Send webhook for call ended
    const webhookResponse = await helper.sendWebhook(WEBHOOK_EVENTS.callEnded);
    expect(webhookResponse.ok()).toBeTruthy();

    // Wait for processing
    await page.waitForTimeout(5000);

    // Check call log shows suggested disposition
    const callLog = await helper.getCallLogBySessionId(TEST_CALL_DATA.sessionId);
    expect(callLog).toBeTruthy();
    expect(callLog.disposition_status).toBe('suggested');

    // Verify suggestion is stored in metadata
    expect(callLog.metadata.suggested_disposition).toBeTruthy();
    expect(callLog.metadata.suggested_disposition.disposition_name).toBe('Follow-up Required');
    expect(callLog.metadata.suggested_disposition.confidence).toBeGreaterThan(60);
    expect(callLog.metadata.suggested_disposition.confidence).toBeLessThan(75);

    // Verify in UI - should show suggestion for manual review
    await page.goto('/calls');
    await page.waitForSelector('[data-testid="call-list"]');

    const callRow = page.locator(`[data-call-id="${TEST_CALL_DATA.callId}"]`);
    await expect(callRow).toBeVisible();

    // Should show "Needs Review" or similar
    const statusIndicator = callRow.locator('[data-testid="disposition-status"]');
    await expect(statusIndicator).toContainText('Suggested');

    // Click to view details
    await callRow.click();

    // Should show AI suggestion panel
    const suggestionPanel = page.locator('[data-testid="ai-suggestion-panel"]');
    await expect(suggestionPanel).toBeVisible();
    await expect(suggestionPanel).toContainText('Follow-up Required');
    await expect(suggestionPanel).toContainText('68%'); // Confidence score
  });

  test('should flag for manual review with low confidence', async ({ page }) => {
    // Mock low-confidence analysis
    await helper.mockTranscriptionService(
      "This is unacceptable! Your technician was late, didn't fix the problem, and was rude. " +
      "I want to speak to a manager immediately. This is the worst service I've ever received."
    );
    await helper.mockAnalysisService(MOCK_ANALYSIS_RESULTS.lowConfidence);

    // Send webhook for call ended
    const webhookResponse = await helper.sendWebhook(WEBHOOK_EVENTS.callEnded);
    expect(webhookResponse.ok()).toBeTruthy();

    // Wait for processing
    await page.waitForTimeout(5000);

    // Check call log requires manual review
    const callLog = await helper.getCallLogBySessionId(TEST_CALL_DATA.sessionId);
    expect(callLog).toBeTruthy();
    expect(callLog.disposition_status).toBe('manual_required');

    // Verify manual review flag is set
    expect(callLog.metadata.manual_review_required).toBeTruthy();
    expect(callLog.metadata.manual_review_required.reason).toBe('Low confidence in auto-disposition');
    expect(callLog.metadata.manual_review_required.priority).toBe('high'); // High priority due to low confidence

    // Verify in UI - should be prominently flagged
    await page.goto('/calls');
    await page.waitForSelector('[data-testid="call-list"]');

    const callRow = page.locator(`[data-call-id="${TEST_CALL_DATA.callId}"]`);
    await expect(callRow).toBeVisible();

    // Should show urgent review needed
    const urgentFlag = callRow.locator('[data-testid="urgent-review-flag"]');
    await expect(urgentFlag).toBeVisible();
    await expect(urgentFlag).toHaveClass(/text-red/); // Red for urgent

    const statusIndicator = callRow.locator('[data-testid="disposition-status"]');
    await expect(statusIndicator).toContainText('Manual Review Required');
  });

  test('should handle calls without recordings', async ({ page }) => {
    // Create webhook for call without recording
    const noRecordingWebhook = {
      ...WEBHOOK_EVENTS.callEnded,
      body: {
        ...WEBHOOK_EVENTS.callEnded.body,
        hasRecording: false,
        recordingUrl: null
      }
    };

    // Send webhook
    const webhookResponse = await helper.sendWebhook(noRecordingWebhook);
    expect(webhookResponse.ok()).toBeTruthy();

    // Wait for processing
    await page.waitForTimeout(3000);

    // Check call log was processed with basic disposition
    const callLog = await helper.getCallLogBySessionId(TEST_CALL_DATA.sessionId);
    expect(callLog).toBeTruthy();
    expect(callLog.transcription_status).toBe('skipped');
    expect(callLog.analysis_status).toBe('skipped');

    // Should have basic rule-based disposition
    expect(callLog.disposition_status).toMatch(/auto_applied|manual_required/);
  });

  test('should handle transcription failures gracefully', async ({ page }) => {
    // Mock transcription failure
    await page.addInitScript(() => {
      window.mockTranscriptionError = 'Audio file not found';
    });

    // Send webhook
    const webhookResponse = await helper.sendWebhook(WEBHOOK_EVENTS.callEnded);
    expect(webhookResponse.ok()).toBeTruthy();

    // Wait for processing
    await page.waitForTimeout(5000);

    // Check call log shows failed transcription
    const callLog = await helper.getCallLogBySessionId(TEST_CALL_DATA.sessionId);
    expect(callLog).toBeTruthy();
    expect(callLog.transcription_status).toBe('failed');
    expect(callLog.analysis_status).toBe('pending');
    expect(callLog.disposition_status).toBe('manual_required');

    // Verify error is stored in metadata
    expect(callLog.metadata.transcription_error).toBeTruthy();
    expect(callLog.metadata.transcription_error.error).toContain('Audio file not found');
  });

  test('should process recording ready event', async ({ page }) => {
    // First send call ended without recording
    const noRecordingWebhook = {
      ...WEBHOOK_EVENTS.callEnded,
      body: {
        ...WEBHOOK_EVENTS.callEnded.body,
        hasRecording: false,
        recordingUrl: null
      }
    };

    await helper.sendWebhook(noRecordingWebhook);
    await page.waitForTimeout(2000);

    // Then send recording ready event
    const webhookResponse = await helper.sendWebhook(WEBHOOK_EVENTS.recordingReady);
    expect(webhookResponse.ok()).toBeTruthy();

    // Wait for processing
    await page.waitForTimeout(5000);

    // Verify call was processed with recording
    const callLog = await helper.getCallLogBySessionId(TEST_CALL_DATA.sessionId);
    expect(callLog).toBeTruthy();
    expect(callLog.has_recording).toBe(true);
    expect(callLog.recording_url).toBe('https://test-recording-url.com/recording.mp3');
  });

  test('should show real-time processing status in UI', async ({ page }) => {
    // Navigate to calls page
    await page.goto('/calls');

    // Mock real-time updates (WebSocket or polling)
    await helper.mockAnalysisService(MOCK_ANALYSIS_RESULTS.highConfidence);

    // Send webhook to start processing
    const webhookResponse = await helper.sendWebhook(WEBHOOK_EVENTS.callEnded);
    expect(webhookResponse.ok()).toBeTruthy();

    // Should show processing status immediately
    await page.waitForSelector('[data-testid="call-list"]');

    // Look for processing indicator
    const processingIndicator = page.locator('[data-testid="processing-indicator"]');
    await expect(processingIndicator).toBeVisible();
    await expect(processingIndicator).toContainText('Processing');

    // Wait for completion
    await page.waitForTimeout(5000);

    // Should show completed status
    const callRow = page.locator(`[data-call-id="${TEST_CALL_DATA.callId}"]`);
    const dispositionBadge = callRow.locator('[data-testid="disposition-badge"]');
    await expect(dispositionBadge).toBeVisible();
    await expect(processingIndicator).toBeHidden();
  });

  test('should handle duplicate webhook events', async ({ page }) => {
    // Send the same webhook twice
    const webhookResponse1 = await helper.sendWebhook(WEBHOOK_EVENTS.callEnded);
    const webhookResponse2 = await helper.sendWebhook(WEBHOOK_EVENTS.callEnded);

    expect(webhookResponse1.ok()).toBeTruthy();
    expect(webhookResponse2.ok()).toBeTruthy();

    const result1 = await webhookResponse1.json();
    const result2 = await webhookResponse2.json();

    // Both should be accepted, but second should be identified as duplicate
    expect(result1.status).toBe('received');
    expect(result2.status).toBe('received');

    // Wait for processing
    await page.waitForTimeout(5000);

    // Should only have one call log entry
    const response = await page.request.get('/api/v2/ringcentral/calls');
    const callsData = await response.json();

    const matchingCalls = callsData.calls?.filter(
      (call: any) => call.rc_session_id === TEST_CALL_DATA.sessionId
    );

    expect(matchingCalls).toHaveLength(1);
  });

  test('should maintain audit trail for disposition changes', async ({ page }) => {
    // Mock high-confidence analysis for auto-apply
    await helper.mockAnalysisService(MOCK_ANALYSIS_RESULTS.highConfidence);

    // Process call
    await helper.sendWebhook(WEBHOOK_EVENTS.callEnded);
    await page.waitForTimeout(5000);

    // Get call log
    const callLog = await helper.getCallLogBySessionId(TEST_CALL_DATA.sessionId);
    expect(callLog.disposition_status).toBe('auto_applied');

    // Check disposition history was created
    const historyResponse = await page.request.get(
      `/api/v2/call-dispositions/${callLog.disposition_id}/history`
    );
    const history = await historyResponse.json();

    expect(history).toHaveLength(1);
    expect(history[0].action_type).toBe('auto_applied');
    expect(history[0].applied_by_type).toBe('system');
    expect(history[0].confidence_score).toBeGreaterThan(75);
    expect(history[0].disposition_name).toBe('Resolved - Customer Satisfied');

    // Verify in UI - audit trail should be visible
    await page.goto(`/calls/${callLog.id}`);

    const auditSection = page.locator('[data-testid="disposition-audit-trail"]');
    await expect(auditSection).toBeVisible();
    await expect(auditSection).toContainText('Auto-applied by system');
    await expect(auditSection).toContainText('92% confidence');
  });
});

test.describe('Job Queue Management', () => {
  test('should show job status in admin panel', async ({ page }) => {
    // Navigate to admin/jobs panel
    await page.goto('/admin/jobs');

    // Should show queue statistics
    const queueStats = page.locator('[data-testid="queue-statistics"]');
    await expect(queueStats).toBeVisible();

    // Should show different job types
    await expect(page.locator('[data-testid="transcription-jobs"]')).toBeVisible();
    await expect(page.locator('[data-testid="analysis-jobs"]')).toBeVisible();
    await expect(page.locator('[data-testid="disposition-jobs"]')).toBeVisible();

    // Should allow cancelling queued jobs
    const cancelButton = page.locator('[data-testid="cancel-job-btn"]').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();

      const confirmDialog = page.locator('[data-testid="confirm-cancel-dialog"]');
      await expect(confirmDialog).toBeVisible();

      await page.locator('[data-testid="confirm-cancel-btn"]').click();

      // Should show cancelled status
      await expect(page.locator('[data-testid="job-status-cancelled"]')).toBeVisible();
    }
  });

  test('should handle job failures and retries', async ({ page }) => {
    // This would require mocking job failures
    // Implementation depends on specific error scenarios
    console.log('Job failure and retry testing would require additional mock setup');
  });
});

test.describe('Performance and Scalability', () => {
  test('should handle multiple concurrent calls', async ({ page }) => {
    const helper = new AutomationTestHelper(page);

    // Create multiple test calls
    const testCalls = Array.from({ length: 5 }, (_, i) => ({
      ...TEST_CALL_DATA,
      sessionId: `test_session_${i}`,
      callId: `rc_call_${i}`
    }));

    // Send webhooks for all calls
    const webhookPromises = testCalls.map(callData => {
      const webhook = {
        ...WEBHOOK_EVENTS.callEnded,
        body: {
          ...WEBHOOK_EVENTS.callEnded.body,
          telephonySessionId: callData.sessionId
        }
      };
      return helper.sendWebhook(webhook);
    });

    const results = await Promise.all(webhookPromises);

    // All should be accepted
    for (const response of results) {
      expect(response.ok()).toBeTruthy();
    }

    // Wait for processing
    await page.waitForTimeout(10000);

    // All calls should be processed
    for (const callData of testCalls) {
      const callLog = await helper.getCallLogBySessionId(callData.sessionId);
      expect(callLog).toBeTruthy();
      expect(callLog.disposition_status).toMatch(/auto_applied|suggested|manual_required/);
    }
  });
});

// Helper for debugging test failures
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    // Log final state for debugging
    console.log('Test failed, capturing final state...');

    try {
      const queueStats = await page.request.get('/api/v2/jobs/queue/stats');
      const statsData = await queueStats.json();
      console.log('Queue stats:', statsData);

      const webhookStats = await page.request.get('/api/v2/webhooks/stats');
      const webhookData = await webhookStats.json();
      console.log('Webhook stats:', webhookData);
    } catch (e) {
      console.log('Failed to capture debug info:', e);
    }
  }
});