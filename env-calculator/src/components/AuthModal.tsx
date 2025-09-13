'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Body1,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogBody,
  DialogActions,
  Field,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Divider,
} from '@fluentui/react-components';
import { useAuthStore } from '@/stores';
import styles from './AuthModal.module.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState('');
  const [error, setError] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  
  const { login, register, setAuthMode } = useAuthStore();

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setRecoveryKey('');
    setError('');
    setShowRecoveryKey(false);
    setGeneratedRecoveryKey('');
    setIsResetMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isResetMode) {
        // 密码重置逻辑
        const userData = localStorage.getItem(`env_calc_user_data_${username}`);
        if (!userData) {
          setError('用户不存在');
          return;
        }
        
        const user = JSON.parse(userData);
        if (user.recoveryKey !== recoveryKey.trim()) {
          setError('恢复密钥不正确');
          return;
        }
        
        // 更新密码
        user.password = password;
        localStorage.setItem(`env_calc_user_data_${username}`, JSON.stringify(user));
        
        // 自动登录
        // eslint-disable-next-line no-unused-vars
        const { password: _, recoveryKey: __, ...userWithoutSensitive } = user;
        login(userWithoutSensitive);
        setAuthMode('registered');
        onClose();
        resetForm();
        
      } else if (isLogin) {
        // 登录逻辑
        const userData = localStorage.getItem(`env_calc_user_data_${username}`);
        if (!userData) {
          setError('用户名或密码错误');
          return;
        }
        
        const user = JSON.parse(userData);
        if (user.password !== password) {
          setError('用户名或密码错误');
          return;
        }
        
        // eslint-disable-next-line no-unused-vars
        const { password: _, recoveryKey, ...userWithoutSensitive } = user;
        login(userWithoutSensitive);
        setAuthMode('registered');
        onClose();
        resetForm();
        
      } else {
        // 注册逻辑
        if (password !== confirmPassword) {
          setError('密码确认不匹配');
          return;
        }
        
        if (password.length < 6) {
          setError('密码长度至少6位');
          return;
        }
        
        // 检查用户名是否已存在
        if (localStorage.getItem(`env_calc_user_data_${username}`)) {
          setError('用户名已存在');
          return;
        }
        
        const result = await register(username, password);
        setGeneratedRecoveryKey(result.recoveryKey);
        setShowRecoveryKey(true);
      }
    } catch {
      setError('操作失败，请重试');
    }
  };

  const handleRecoveryKeyConfirm = () => {
    // eslint-disable-next-line no-unused-vars
    const { password: _, recoveryKey, ...userWithoutSensitive } = JSON.parse(
      localStorage.getItem(`env_calc_user_data_${username}`) || '{}'
    );
    login(userWithoutSensitive);
    setAuthMode('registered');
    setShowRecoveryKey(false);
    onClose();
    resetForm();
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (showRecoveryKey) {
    return (
      <Dialog open={isOpen}>
        <DialogSurface className={styles.recoveryDialogSurface}>
          <DialogTitle className={styles.recoveryDialogTitle}>
            保存您的恢复密钥
          </DialogTitle>
          <DialogContent className={styles.recoveryDialogContent}>
            <DialogBody className={styles.recoveryDialogBody}>
              <MessageBar intent="warning" className={styles.recoveryMessageBar}>
                <MessageBarBody>
                  <MessageBarTitle>重要提示</MessageBarTitle>
                  请务必保存以下恢复密钥！这是您忘记密码时找回账户的唯一方式。
                </MessageBarBody>
              </MessageBar>

              <div className={styles.recoveryKeySection}>
                <Label
                  htmlFor="recoveryKeyDisplay"
                  className={styles.recoveryKeyLabel}
                >
                  恢复密钥：
                </Label>
                <Input
                  id="recoveryKeyDisplay"
                  value={generatedRecoveryKey}
                  readOnly
                  className={styles.recoveryKeyInput}
                />
              </div>

              <Body1 className={styles.recoveryInstructions}>
                请将此密钥复制并保存在安全的地方。此密钥仅显示一次，关闭后无法再次查看。
              </Body1>
            </DialogBody>
            <DialogActions className={styles.recoveryDialogActions}>
              <Button
                appearance="primary"
                onClick={handleRecoveryKeyConfirm}
                size="large"
                className={styles.recoveryButton}
              >
                我已保存密钥，继续
              </Button>
            </DialogActions>
          </DialogContent>
        </DialogSurface>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen}>
      <DialogSurface className={styles.dialogSurface}>
        <DialogTitle className={styles.dialogTitle}>
          {isResetMode ? '重置密码' : isLogin ? '登录' : '注册'}
        </DialogTitle>
        <DialogContent className={styles.dialogContent}>
          <DialogBody className={styles.dialogBody}>
            <form onSubmit={handleSubmit} className={styles.formContainer}>
              <div className={styles.formFieldsContainer}>
                {error && (
                  <MessageBar intent="error" className={styles.messageBar}>
                    <MessageBarBody className={styles.messageBarBody}>{error}</MessageBarBody>
                  </MessageBar>
                )}

                <div className={styles.fieldWrapper}>
                  <Field
                    label="用户名"
                    required
                    className={styles.field}
                  >
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className={styles.input}
                    />
                  </Field>
                </div>

                {isResetMode && (
                  <div className={styles.fieldWrapper}>
                    <Field
                      label="恢复密钥"
                      required
                      className={styles.field}
                    >
                      <Input
                        type="text"
                        value={recoveryKey}
                        onChange={(e) => setRecoveryKey(e.target.value)}
                        placeholder="输入注册时保存的恢复密钥"
                        required
                        className={styles.recoveryInput}
                      />
                    </Field>
                  </div>
                )}

                <div className={styles.fieldWrapper}>
                  <Field
                    label={isResetMode ? "新密码" : "密码"}
                    required
                    className={styles.field}
                  >
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={styles.input}
                    />
                  </Field>
                </div>

                {(!isLogin || isResetMode) && (
                  <div className={styles.fieldWrapper}>
                    <Field
                      label="确认密码"
                      required
                      className={styles.field}
                    >
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={styles.input}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </form>
          </DialogBody>
          <DialogActions className={styles.dialogActions}>
            <Button
              onClick={handleClose}
              className={styles.actionButton}
            >
              取消
            </Button>
            <Button
              appearance="primary"
              onClick={handleSubmit}
              className={styles.actionButton}
            >
              {isResetMode ? '重置密码' : isLogin ? '登录' : '注册'}
            </Button>
          </DialogActions>

          <Divider className={styles.divider} />

          <div className={styles.bottomSection}>
            {!isResetMode ? (
              <>
                <Body1>
                  {isLogin ? '还没有账户？' : '已有账户？'}
                  <Button
                    appearance="subtle"
                    onClick={() => setIsLogin(!isLogin)}
                    style={{ marginLeft: '8px' }}
                  >
                    {isLogin ? '注册' : '登录'}
                  </Button>
                </Body1>
                
                {isLogin && (
                  <div style={{ marginTop: '8px' }}>
                    <Button
                      appearance="subtle"
                      onClick={() => setIsResetMode(true)}
                    >
                      忘记密码？
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Body1>
                <Button
                  appearance="subtle"
                  onClick={() => {
                    setIsResetMode(false);
                    setIsLogin(true);
                  }}
                >
                  返回登录
                </Button>
              </Body1>
            )}
          </div>
        </DialogContent>
      </DialogSurface>
    </Dialog>
  );
}