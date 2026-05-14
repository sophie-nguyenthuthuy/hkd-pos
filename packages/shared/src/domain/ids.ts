/**
 * Branded ID types prevent accidental cross-table id mixups at the type level.
 * Underlying representation is `string` (cuid2 / ULID — chosen by API layer).
 */
type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type BusinessId = Brand<string, 'BusinessId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type InvoiceId = Brand<string, 'InvoiceId'>;
export type TaxDeclarationId = Brand<string, 'TaxDeclarationId'>;

export const asUserId = (s: string): UserId => s as UserId;
export const asBusinessId = (s: string): BusinessId => s as BusinessId;
export const asProductId = (s: string): ProductId => s as ProductId;
export const asOrderId = (s: string): OrderId => s as OrderId;
export const asInvoiceId = (s: string): InvoiceId => s as InvoiceId;
export const asTaxDeclarationId = (s: string): TaxDeclarationId => s as TaxDeclarationId;
