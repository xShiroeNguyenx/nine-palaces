/** Schema kiểm tra dữ liệu (zod) — chỉ server dùng, để gói web không phải tải zod */
import { z } from 'zod';
import type { ClientMessage, LobbyClientMessage, ProgressData, RoomSettings, TimeControl } from './index';

export const TimeControlSchema: z.ZodType<TimeControl> = z
  .object({
    initialMs: z.number().int().min(30_000).max(3 * 3600_000),
    incrementMs: z.number().int().min(0).max(120_000),
  })
  .nullable();

export const RoomSettingsSchema = z.object({
  timeControl: TimeControlSchema,
  rated: z.boolean(),
  private: z.boolean(),
  side: z.enum(['red', 'black', 'random']),
  training: z.boolean(),
  variant: z.enum(['xiangqi', 'jieqi']).default('xiangqi'),
}) satisfies z.ZodType<RoomSettings, z.ZodTypeDef, unknown>;

export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('room:ready'), ready: z.boolean() }),
  z.object({ type: z.literal('game:move'), seq: z.number().int().min(0), move: z.string().regex(/^[a-i][0-9][a-i][0-9]$/) }),
  z.object({ type: z.literal('game:resign') }),
  z.object({ type: z.literal('game:offerDraw') }),
  z.object({ type: z.literal('game:respondDraw'), accept: z.boolean() }),
  z.object({ type: z.literal('game:requestUndo') }),
  z.object({ type: z.literal('game:respondUndo'), accept: z.boolean() }),
  z.object({ type: z.literal('game:rematch') }),
  z.object({ type: z.literal('game:claimAbandon') }),
  z.object({ type: z.literal('chat:send'), text: z.string().min(1).max(200), emote: z.boolean().optional() }),
  z.object({ type: z.literal('clock:ping'), t: z.number() }),
]) satisfies z.ZodType<ClientMessage>;

export const ProgressSchema = z.object({
  xp: z.number().int().min(0),
  totalWins: z.number().int().min(0),
  unlockWins: z.number().int().min(0),
  aiLevelUnlocked: z.number().int().min(1).max(10),
  aiWins: z.record(z.string(), z.number().int().min(0)),
  streak: z.number().int().min(0),
  bestStreak: z.number().int().min(0),
  achievements: z.array(z.string().max(40)).max(200).default([]),
}) satisfies z.ZodType<ProgressData, z.ZodTypeDef, unknown>;

export const LobbyClientSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('queue:join'), rated: z.boolean(), timeControl: TimeControlSchema }),
  z.object({ type: z.literal('queue:leave') }),
]) satisfies z.ZodType<LobbyClientMessage>;
