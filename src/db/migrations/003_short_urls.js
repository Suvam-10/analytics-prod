exports.up = async function(knex) {
  await knex.schema.createTable('short_urls', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('app_id').references('id').inTable('apps').onDelete('CASCADE');
    t.text('short_code').unique().notNullable();
    t.text('target_url').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.bigInteger('clicks').defaultTo(0);
  });

  await knex.schema.createTable('short_url_clicks', t => {
    t.bigIncrements('id').primary();
    t.uuid('short_url_id').references('id').inTable('short_urls').onDelete('CASCADE');
    t.text('ip_address');
    t.text('user_agent');
    t.timestamp('timestamp').defaultTo(knex.fn.now());
    t.jsonb('metadata').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('short_url_clicks');
  await knex.schema.dropTableIfExists('short_urls');
};
