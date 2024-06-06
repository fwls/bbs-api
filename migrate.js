const bcrypt = require("bcryptjs");
require("dotenv").config();

const knex = require("knex")({
  client: process.env.DB_CLIENT,
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
});

async function dropTables() {
  try {
    await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
    await knex.schema.dropTableIfExists("users");
    await knex.schema.dropTableIfExists("posts");
    await knex.schema.dropTableIfExists("comments");
    await knex.schema.dropTableIfExists("likes");
    await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');
  } catch (error) {
    console.log(error)
  }
}

async function createTables() {
  await knex.schema.createTable("users", function (table) {
    table.increments("id").primary();
    table.string("username", 255).notNullable().unique();
    table.string("email", 255).notNullable().unique();
    table.string("password", 255).notNullable();
    table.text("bio").nullable();
    table.smallint("is_admin").defaultTo(1);
    table.string("profile_image_url", 255).nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("posts", function (table) {
    table.increments("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("title", 255).notNullable();
    table.text("content").notNullable();
    table.integer("likes_count").defaultTo(0);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("comments", function (table) {
    table.increments("id").primary();
    table
      .integer("post_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("posts")
      .onDelete("CASCADE");
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.text("content").notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("likes", function (table) {
    table.increments("id").primary();
    table
      .integer("post_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("posts")
      .onDelete("CASCADE");
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.timestamps(true, true);
    table.unique(["post_id", "user_id"]); // 确保用户不能对同一帖子多次点赞
  });
}

async function seed() {
  await knex("users").insert([
    {
      username: "Alice",
      email: "alice@example.com",
      password: await bcrypt.hash("password123", 10),
      bio: "Loves cats and coding.",
    },
    {
      username: "Bob",
      email: "bob@example.com",
      password: await bcrypt.hash("securepass456", 10),
      profile_image_url: "https://example.com/bob-avatar.jpg",
    },
  ]);
}

async function main() {
  await dropTables();
  await createTables();
  await seed();
  process.exit();
}

main();
