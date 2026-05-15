import { NDD70_REVENUE_THRESHOLD_VND, formatVND } from '@hkd-pos/shared';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/client';
import { colors, radius, spacing, type } from '../theme/index';

interface Forecast {
  ytdRevenueVnd: number;
  projectedAnnualRevenueVnd: number;
  vatVnd: number;
  pitVnd: number;
  totalVnd: number;
  exempt: boolean;
}

interface Business {
  id: string;
  name: string;
}

export function HomeScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<{ navigate: (route: string) => void }>();

  const businesses = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api<Business[]>('/businesses'),
  });

  const businessId = businesses.data?.[0]?.id;

  const forecast = useQuery({
    queryKey: ['forecast', businessId],
    enabled: Boolean(businessId),
    queryFn: () => api<Forecast>(`/businesses/${businessId}/tax/forecast`),
  });

  const overThreshold =
    forecast.data && forecast.data.projectedAnnualRevenueVnd >= NDD70_REVENUE_THRESHOLD_VND;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('home.todayRevenue')}</Text>
        <Text style={styles.cardValue}>{formatVND(forecast.data?.ytdRevenueVnd ?? 0)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('home.forecastTax')}</Text>
        <Text style={styles.cardValue}>{formatVND(forecast.data?.totalVnd ?? 0)}</Text>
        <Text style={styles.cardSubtle}>
          VAT {formatVND(forecast.data?.vatVnd ?? 0)} • TNCN {formatVND(forecast.data?.pitVnd ?? 0)}
        </Text>
      </View>

      {overThreshold ? (
        <View style={[styles.card, styles.warnCard]}>
          <Text style={styles.warnText}>{t('home.nd70Warning')}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => nav.navigate('NewSale')}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.ctaText}>{t('home.newSale')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardLabel: { color: colors.textMuted, fontSize: type.caption },
  cardValue: {
    color: colors.text,
    fontSize: type.display,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  cardSubtle: { color: colors.textMuted, fontSize: type.caption, marginTop: spacing.xs },
  warnCard: { backgroundColor: colors.warn },
  warnText: { color: '#0F172A', fontWeight: '700' },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'center',
  },
  ctaText: { color: colors.primaryText, fontSize: type.display, fontWeight: '700' },
});
