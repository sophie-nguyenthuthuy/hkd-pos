import { PhoneSchema } from '@hkd-pos/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuthStore } from '../store/auth';
import { colors, radius, spacing, type } from '../theme/index';

type Stage = 'phone' | 'otp';

export function LoginScreen() {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  const requestOtp = useAuthStore((s) => s.requestOtp);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  async function onSendOtp() {
    const parsed = PhoneSchema.safeParse(phone);
    if (!parsed.success) {
      Alert.alert(t('auth.errors.invalidPhone'));
      return;
    }
    setBusy(true);
    try {
      await requestOtp(parsed.data, 'LOGIN');
      setPhone(parsed.data);
      setStage('otp');
    } catch (err) {
      Alert.alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    if (otp.length !== 6) {
      Alert.alert(t('auth.errors.otpRequired'));
      return;
    }
    setBusy(true);
    try {
      await verifyOtp({ phone, otp, purpose: 'LOGIN' });
    } catch (err) {
      Alert.alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.welcome')}</Text>
      <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

      {stage === 'phone' ? (
        <>
          <Text style={styles.label}>{t('auth.phoneLabel')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('auth.phonePlaceholder')}
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            autoComplete="tel"
            inputMode="tel"
          />
          <PrimaryButton label={t('auth.sendOtp')} onPress={onSendOtp} busy={busy} />
        </>
      ) : (
        <>
          <Text style={styles.label}>{t('auth.otpLabel')}</Text>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            inputMode="numeric"
          />
          <PrimaryButton label={t('auth.verify')} onPress={onVerify} busy={busy} />
        </>
      )}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  busy,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.button,
        pressed && { opacity: 0.85 },
        busy && { opacity: 0.6 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.primaryText} />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  title: { color: colors.text, fontSize: type.display, fontWeight: '700' },
  subtitle: {
    color: colors.textMuted,
    fontSize: type.body,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  label: { color: colors.text, fontSize: type.caption, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: type.title,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonText: { color: colors.primaryText, fontSize: type.title, fontWeight: '700' },
});
