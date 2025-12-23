"""
Security Invariants Test Suite

Tests that verify security properties that must ALWAYS hold true.

Run with:
    pytest tests/security_invariants/ -v

Run specific categories:
    pytest tests/security_invariants/ -v -m csrf
    pytest tests/security_invariants/ -v -m rbac
    pytest tests/security_invariants/ -v -m webhook
    pytest tests/security_invariants/ -v -m injection
"""
