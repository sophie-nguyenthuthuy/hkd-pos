import { formatVND } from '@hkd-pos/shared';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/client';
import { colors, radius, spacing, type } from '../theme/index';

interface Product {
  id: string;
  sku: string;
  name: string;
  unit: string;
  unitPriceVnd: string;
  vatRateBps: number;
}

interface Business {
  id: string;
}

export function ProductsScreen() {
  const { t } = useTranslation();
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

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={products.data ?? []}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.sku} • VAT {item.vatRateBps / 100}%
            </Text>
          </View>
          <Text style={styles.price}>
            {formatVND(Number(item.unitPriceVnd))}/{item.unit}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={{ color: colors.textMuted, padding: spacing.xl, textAlign: 'center' }}>
          {products.isLoading ? t('common.loading') : '—'}
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
  name: { color: colors.text, fontSize: type.body, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: type.caption, marginTop: 2 },
  price: { color: colors.text, fontSize: type.title, fontWeight: '700' },
});
