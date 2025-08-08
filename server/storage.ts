import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { type User, type InsertUser, type Card, type InsertCard, type Room, type InsertRoom, users, cards, rooms } from "@shared/schema";

// Database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStats(id: string, wins: number, losses: number): Promise<void>;
  updateUserProfile(id: string, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Card operations
  getAllCards(): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  updateCard(id: string, updates: Partial<Card>): Promise<Card>;
  deleteCard(id: string): Promise<void>;

  // Room operations
  getAllRooms(): Promise<Room[]>;
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, updates: Partial<Room>): Promise<Room>;
  deleteRoom(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserStats(id: string, wins: number, losses: number): Promise<void> {
    await db.update(users).set({ wins, losses }).where(eq(users.id, id));
  }

  async updateUserProfile(id: string, updates: Partial<User>): Promise<User> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Card operations
  async getAllCards(): Promise<Card[]> {
    return await db.select().from(cards);
  }

  async getCard(id: string): Promise<Card | undefined> {
    const result = await db.select().from(cards).where(eq(cards.id, id)).limit(1);
    return result[0];
  }

  async createCard(card: InsertCard): Promise<Card> {
    const result = await db.insert(cards).values(card).returning();
    return result[0];
  }

  async updateCard(id: string, updates: Partial<Card>): Promise<Card> {
    const result = await db.update(cards).set(updates).where(eq(cards.id, id)).returning();
    return result[0];
  }

  async deleteCard(id: string): Promise<void> {
    await db.delete(cards).where(eq(cards.id, id));
  }

  // Room operations
  async getAllRooms(): Promise<Room[]> {
    return await db.select().from(rooms);
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
    return result[0];
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const result = await db.insert(rooms).values(room).returning();
    return result[0];
  }

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room> {
    const result = await db.update(rooms).set(updates).where(eq(rooms.id, id)).returning();
    return result[0];
  }

  async deleteRoom(id: string): Promise<void> {
    await db.delete(rooms).where(eq(rooms.id, id));
  }
}

export const storage = new DatabaseStorage();
