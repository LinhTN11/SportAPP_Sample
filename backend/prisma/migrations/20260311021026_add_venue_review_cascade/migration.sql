-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_venue_id_fkey";

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "phone" TEXT;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
