import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  displayName: text("display_name"),
  profilePicture: text("profile_picture"),
  isAdmin: boolean("is_admin").default(false),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  hp: integer("hp").default(20),
  energy: integer("energy").default(100),
  deck: text("deck").array().default(sql`ARRAY[]::text[]`),
  spellDeck: text("spell_deck").array().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const cards = pgTable("cards", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  class: text("class"),
  health: integer("health"),
  attack: integer("attack"),
  defense: integer("defense"),
  criticalChance: integer("critical_chance"),
  criticalDamage: integer("critical_damage"),
  rangedResistance: integer("ranged_resistance"),
  meleeResistance: integer("melee_resistance"),
  magicResistance: integer("magic_resistance"),
  passiveAbilities: text("passive_abilities").array().default(sql`ARRAY[]::text[]`),
  passiveSkill: text("passive_skill"),
  cost: integer("cost"),
  spellType: text("spell_type"),
  description: text("description"),
  battleDescription: text("battle_description"), // New field for battle card descriptions
  imageUrl: text("image_url"),
  isBase: boolean("is_base").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  hostId: text("host_id").notNull(),
  hostName: text("host_name").notNull(),
  players: text("players").array().default(sql`ARRAY[]::text[]`),
  maxPlayers: integer("max_players").default(2),
  status: text("status").default('waiting'),
  description: text("description"),
  battleId: text("battle_id"),
  playersReady: text("players_ready").array().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
});

export const insertCardSchema = createInsertSchema(cards).omit({
  createdAt: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cards.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;
