-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "owner_pit" DECIMAL(12,0),
ADD COLUMN     "owner_vat" DECIMAL(12,0),
ADD COLUMN     "platform_fee" DECIMAL(12,0),
ADD COLUMN     "platform_vat" DECIMAL(12,0);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "tax_code" TEXT;

-- CreateTable
CREATE TABLE "tax_vouchers" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "voucher_number" TEXT NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "total_income" DECIMAL(12,0) NOT NULL,
    "pit_withheld" DECIMAL(12,0) NOT NULL,
    "vat_withheld" DECIMAL(12,0) NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_vouchers_voucher_number_key" ON "tax_vouchers"("voucher_number");

-- AddForeignKey
ALTER TABLE "tax_vouchers" ADD CONSTRAINT "tax_vouchers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
