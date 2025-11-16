exports.up = async function(knex) {
  await knex.schema.createTable('events', table => {
    table.bigIncrements('id').primary();
    table.uuid('app_id').references('id').inTable('apps').onDelete('CASCADE').index();
    table.string('event_type').notNullable().index();
    table.string('url').nullable();
    table.string('referrer').nullable();
    table.string('device').nullable();
    table.string('ip_address').nullable();
    table.timestamp('timestamp').notNullable().index();
    table.jsonb('metadata').nullable();
    table.string('user_id').nullable().index();
  });
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_events_app_event_time ON events(app_id, event_type, timestamp DESC);');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('events');
};
