import { computeInvoiceTotals, formatVND } from '@hkd-pos/shared';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ulid } from 'ulid';

import { api } from '../api/client';
import { colors, radius, spacing, type } from '../theme/index';

interface Business {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  unit: string;
  unitPriceVnd: string; // BigInt serialized
  vatRateBps: number;
}

interface Line {
  productId: string;
  name: string;
  unit: string;
  unitPriceVnd: number;
  vatRate: number;
  quantity: number;
  discountVnd: number;
}

export function NewSaleScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<{ goBack: () => void }>();
  const qc = useQueryClient();

  const businesses = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api<Business[]>('/businesses'),
  });
  const businessId = businesses.data?.[0]?.id;

  const products = useQuery({
    queryKey: ['products', businessId],
    enabled: Boolean(businessId),
    queryFn: () => api<Product[]>(`/businesses/${businessId}/products`),
  });

  const [lines, setLines] = useState<Line[]>([]);

  const totals = useMemo(
    () =>
      computeInvoiceTotals(
        lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          quantity: l.quantity,
          unit: l.unit,
          unitPriceVnd: l.unitPriceVnd,
          vatRate: l.vatRate,
          discountVnd: l.discountVnd,
        })),
      ),
    [lines],
  );

  function addProduct(p: Product) {
    setLines((curr) => {
      const existing = curr.find((l) => l.productId === p.id);
      if (existing) {
        return curr.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...curr,
        {
          productId: p.id,
          name: p.name,
          unit: p.unit,
          unitPriceVnd: Number(p.unitPriceVnd),
          vatRate: p.vatRateBps / 10_000,
          quantity: 1,
          discountVnd: 0,
        },
      ];
    });
  }

  const submit = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('No business');
      const order = await api<{ id: string }>(`/businesses/${businessId}/orders`, {
        method: 'POST',
        body: {
          clientOrderRef: ulid(),
          paymentMethod: 'CASH',
          soldAt: new Date().toISOString(),
          lines: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            discountVnd: l.discountVnd,
          })),
        },
      });
      await api<unknown>(`/businesses/${businessId}/invoices/issue/${order.id}`, {
        method: 'POST',
      });
      return order;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] });
      void qc.invalidateQueries({ queryKey: ['forecast'] });
      nav.goBack();
    },
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={products.data ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => addProduct(item)}
            style={({ pressed }) => [styles.productRow, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productMeta}>
                {formatVND(Number(item.unitPriceVnd))} / {item.unit}
              </Text>
            </View>
            <Text style={styles.addPlus}>+</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: 'center', padding: spacing.xl }}>
            {products.isLoading ? t('common.loading') : t('home.products')}
          </Text>
        }
      />

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>
          {t('sale.total')} ({lines.length})
        </Text>
        <Text style={styles.summaryValue}>{formatVND(totals.totalVnd)}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={lines.length === 0 || submit.isPending}
          onPress={() => submit.mutate()}
          style={({ pressed }) => [
            styles.cta,
            (lines.length === 0 || submit.isPending) && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.ctaText}>{t('sale.issueInvoice')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 64,
  },
  productName: { color: colors.text, fontSize: type.title, fontWeight: '600' },
  productMeta: { color: colors.textMuted, fontSize: type.caption, marginTop: 2 },
  addPlus: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
  },
  summary: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  summaryLabel: { color: colors.textMuted, fontSize: type.caption },
  summaryValue: { color: colors.text, fontSize: type.display, fontWeight: '700' },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  ctaText: { color: colors.primaryText, fontSize: type.title, fontWeight: '700' },
});
