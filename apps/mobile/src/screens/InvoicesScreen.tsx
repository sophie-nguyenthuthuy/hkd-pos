import { formatVND } from '@hkd-pos/shared';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/client.js';
import { colors, radius, spacing, type } from '../theme/index.js';

interface Invoice {
  id: string;
  templateCode: string;
  serial: string;
  number: number;
  status: 'DRAFT' | 'SIGNED' | 'TRANSMITTED' | 'REJECTED' | 'VOIDED';
  gdtCode: string | null;
  issuedAt: string;
  totalVnd: string;
}

interface Business {
  id: string;
}

export function InvoicesScreen() {
  const { t } = useTranslation();
  const businesses = useQuery({ queryKey: ['businesses'], queryFn: () => api<Business[]>('/businesses') });
  const businessId = businesses.data?.[0]?.id;
  const invoices = useQuery({
    queryKey: ['invoices', businessId],
    enabled: Boolean(businessId),
    queryFn: () => api<Invoice[]>(`/businesses/${businessId}/invoices`),
  });

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={invoices.data ?? []}
      keyExtractor={(inv) => inv.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {item.serial}-{String(item.number).padStart(6, '0')}
            </Text>
            <Text style={styles.meta}>
              {new Date(item.issuedAt).toLocaleString('vi-VN')} • {t(`invoice.status.${item.status}`)}
            </Text>
            {item.gdtCode ? <Text style={styles.gdt}>{item.gdtCode}</Text> : null}
          </View>
          <Text style={styles.amount}>{formatVND(Number(item.totalVnd))}</Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={{ color: colors.textMuted, padding: spacing.xl, textAlign: 'center' }}>
          {invoices.isLoading ? t('common.loading') : '—'}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: { color: colors.text, fontSize: type.body, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: type.caption, marginTop: 2 },
  gdt: { color: colors.success, fontSize: type.caption, marginTop: 2 },
  amount: { color: colors.text, fontSize: type.title, fontWeight: '700' },
});
