-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_booking_date_idx" ON "bookings"("booking_date");

-- CreateIndex
CREATE INDEX "bookings_hold_expires_at_idx" ON "bookings"("hold_expires_at");

-- CreateIndex
CREATE INDEX "matchmaking_posts_status_idx" ON "matchmaking_posts"("status");

-- CreateIndex
CREATE INDEX "matchmaking_posts_booking_date_idx" ON "matchmaking_posts"("booking_date");

-- CreateIndex
CREATE INDEX "matchmaking_posts_sport_type_idx" ON "matchmaking_posts"("sport_type");

-- CreateIndex
CREATE INDEX "messages_room_id_created_at_idx" ON "messages"("room_id", "created_at");

-- CreateIndex
CREATE INDEX "venues_status_idx" ON "venues"("status");

-- CreateIndex
CREATE INDEX "venues_city_district_idx" ON "venues"("city", "district");
