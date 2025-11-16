exports.up = async function(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  await knex.schema.createTable('apps', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('owner_email').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.boolean('active').defaultTo(true);
    table.jsonb('meta').nullable();
  });

  await knex.schema.createTable('api_keys', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('app_id').notNullable().references('id').inTable('apps').onDelete('CASCADE');
    table.text('key_hash').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable();
    table.boolean('revoked').defaultTo(false);
    table.unique(['app_id', 'id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('api_keys');
  await knex.schema.dropTableIfExists('apps');
};
