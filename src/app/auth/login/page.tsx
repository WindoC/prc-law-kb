'use client';

import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Alert, Modal } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { validateCaptchaToken, CAPTCHA_ERRORS } from '@/lib/captcha';
import LegalInformationSection from '@/components/LegalInformationSection';
import { ContactModal, ContactButton } from '@/components/ContactModal';
import LoginForm from '@/components/LoginForm';

/**
 * Login Page Component
 * Dedicated page for user authentication
 */
export default function LoginPage() {
  const { login, loading } = useAuth();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLegalInfo, setShowLegalInfo] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  /**
   * Handle OAuth login with provider
   */
  const handleLogin = async (provider: 'google' | 'github') => {
    // Validate CAPTCHA token before login
    if (!validateCaptchaToken(captchaToken)) {
      setCaptchaError(CAPTCHA_ERRORS.MISSING_TOKEN);
      return;
    }

    setLoginLoading(true);
    setCaptchaError(null);

    try {
      // Use auth context login method
      login(provider);
    } catch (error) {
      console.error('Login error:', error);
      setCaptchaToken(null); // Reset CAPTCHA on error
      setLoginLoading(false);
      setCaptchaError('登入失敗，請稍後再試');
    }
  };

  /**
   * Handle CAPTCHA verification success
   */
  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setCaptchaError(null);
  };

  /**
   * Handle CAPTCHA verification error
   */
  const handleCaptchaError = () => {
    setCaptchaToken(null);
    setCaptchaError(CAPTCHA_ERRORS.VERIFICATION_FAILED);
  };

  /**
   * Handle CAPTCHA token expiration
   */
  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
    setCaptchaError(CAPTCHA_ERRORS.EXPIRED_TOKEN);
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">載入中...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="min-vh-100 bg-light d-flex align-items-center">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-lg border-0">
              <Card.Header className="bg-primary text-white text-center py-4">
                <h2 className="mb-0">登入澳門法律知識庫</h2>
                <p className="mb-0 mt-2 opacity-75">選擇您的登入方式</p>
              </Card.Header>
              
              <Card.Body className="p-4">
                {/* CAPTCHA Error Alert */}
                {captchaError && (
                  <Alert variant="warning" className="mb-3">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {captchaError}
                  </Alert>
                )}

                {/* Login Buttons */}
                <LoginForm
                  loginLoading={loginLoading}
                  captchaToken={captchaToken}
                  handleLogin={handleLogin}
                  handleCaptchaVerify={handleCaptchaVerify}
                  handleCaptchaError={handleCaptchaError}
                  handleCaptchaExpire={handleCaptchaExpire}
                />

                {/* Help Text */}
                <div className="text-center mt-4">
                  <small className="text-muted">
                    登入即表示您同意我們的
                    <Button 
                      variant="link" 
                      className="text-decoration-none p-0 m-0 border-0" 
                      onClick={() => setShowLegalInfo(true)}
                    >
                      服務條款和隱私政策
                    </Button>
                  </small>
                  <div className="mt-2">
                    <ContactButton onClick={() => setShowContactModal(true)} />
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Legal Information Modal */}
            <Modal 
              show={showLegalInfo} 
              onHide={() => setShowLegalInfo(false)}
              size="lg"
              centered
            >
              <Modal.Header closeButton>
                <Modal.Title>條款與聲明</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <LegalInformationSection />
              </Modal.Body>
            </Modal>

            {/* Contact Modal */}
            <ContactModal
              show={showContactModal}
              onHide={() => setShowContactModal(false)}
            />

            {/* Features Preview */}
            <Card className="mt-4 border-0 shadow-sm">
              <Card.Body>
                <h5 className="text-center mb-3">登入後您可以使用</h5>
                <Row className="g-3 text-center">
                  <Col>
                    <div className="p-2">
                      <i className="fas fa-search text-primary fa-2x mb-2"></i>
                      <div className="small">法律搜索</div>
                    </div>
                  </Col>
                  <Col>
                    <div className="p-2">
                      <i className="fas fa-question-circle text-success fa-2x mb-2"></i>
                      <div className="small">法律問答</div>
                    </div>
                  </Col>
                  <Col>
                    <div className="p-2">
                      <i className="fas fa-comments text-warning fa-2x mb-2"></i>
                      <div className="small">法律諮詢</div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Container>
  );
}