import { formatVND } from '@hkd-pos/shared';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/client.js';
import { colors, radius, spacing, type } from '../theme/index.js';

interface Forecast {
  ytdRevenueVnd: number;
  projectedAnnualRevenueVnd: number;
  vatVnd: number;
  pitVnd: number;
  totalVnd: number;
  daysElapsed: number;
}

interface Business {
  id: string;
}

export function ReportsScreen() {
  const { t } = useTranslation();
  const businesses = useQuery({ queryKey: ['businesses'], queryFn: () => api<Business[]>('/businesses') });
  const businessId = businesses.data?.[0]?.id;
  const forecast = useQuery({
    queryKey: ['forecast', businessId],
    enabled: Boolean(businessId),
    queryFn: () => api<Forecast>(`/businesses/${businessId}/tax/forecast`),
  });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.label}>YTD ({forecast.data?.daysElapsed ?? 0} ngày)</Text>
        <Text style={styles.value}>{formatVND(forecast.data?.ytdRevenueVnd ?? 0)}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>{t('home.forecastTax')}</Text>
        <Text style={styles.value}>{formatVND(forecast.data?.totalVnd ?? 0)}</Text>
        <Text style={styles.sub}>
          VAT {formatVND(forecast.data?.vatVnd ?? 0)} • TNCN {formatVND(forecast.data?.pitVnd ?? 0)}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  label: { color: colors.textMuted, fontSize: type.caption },
  value: { color: colors.text, fontSize: type.display, fontWeight: '700', marginTop: spacing.xs },
  sub: { color: colors.textMuted, fontSize: type.caption, marginTop: spacing.xs },
});
