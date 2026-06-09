/*
  Warnings:

  - You are about to drop the `character_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_characters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_unlocked_items` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[handle]` on the table `user_profiles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `handle` to the `user_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RoomMemberRole" AS ENUM ('HOST', 'MEMBER');

-- CreateEnum
CREATE TYPE "RoomJoinRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "user_characters" DROP CONSTRAINT "user_characters_equippedInstrumentId_fkey";

-- DropForeignKey
ALTER TABLE "user_characters" DROP CONSTRAINT "user_characters_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_unlocked_items" DROP CONSTRAINT "user_unlocked_items_itemId_fkey";

-- DropForeignKey
ALTER TABLE "user_unlocked_items" DROP CONSTRAINT "user_unlocked_items_userId_fkey";

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "bio" VARCHAR(150),
ADD COLUMN     "handle" VARCHAR(30),
ADD COLUMN     "nicknameChangedAt" TIMESTAMPTZ;

-- Backfill handle for existing rows (nickname 영문/숫자 기반 + id prefix)
UPDATE "user_profiles"
SET "handle" = LOWER(REGEXP_REPLACE(nickname, '[^a-zA-Z0-9]', '', 'g')) || '_' || LEFT(id::text, 6)
WHERE "handle" IS NULL;

-- Set NOT NULL after backfill
ALTER TABLE "user_profiles" ALTER COLUMN "handle" SET NOT NULL;

-- DropTable
DROP TABLE "character_items";

-- DropTable
DROP TABLE "user_characters";

-- DropTable
DROP TABLE "user_unlocked_items";

-- DropEnum
DROP TYPE "CharacterType";

-- DropEnum
DROP TYPE "ItemType";

-- CreateTable
CREATE TABLE "friend_requests" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friends" (
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friends_pkey" PRIMARY KEY ("userId","friendId")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "description" VARCHAR(100),
    "inviteCode" VARCHAR(6) NOT NULL,
    "maxMembers" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_members" (
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoomMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_members_pkey" PRIMARY KEY ("roomId","userId")
);

-- CreateTable
CREATE TABLE "room_join_requests" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RoomJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "room_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "friend_requests_toUserId_status_idx" ON "friend_requests"("toUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "friend_requests_fromUserId_toUserId_key" ON "friend_requests"("fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "friends_userId_idx" ON "friends"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_inviteCode_key" ON "rooms"("inviteCode");

-- CreateIndex
CREATE INDEX "rooms_hostId_idx" ON "rooms"("hostId");

-- CreateIndex
CREATE INDEX "room_members_userId_idx" ON "room_members"("userId");

-- CreateIndex
CREATE INDEX "room_join_requests_roomId_status_idx" ON "room_join_requests"("roomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "room_join_requests_roomId_userId_key" ON "room_join_requests"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_handle_key" ON "user_profiles"("handle");

-- AddForeignKey
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_join_requests" ADD CONSTRAINT "room_join_requests_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_join_requests" ADD CONSTRAINT "room_join_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
