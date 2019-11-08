# frozen_string_literal: true

# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20_191_105_204_049) do
  create_table 'constituencies', force: :cascade do |t|
    t.string 'name'
    t.datetime 'created_at', null: false
    t.datetime 'updated_at', null: false
  end

  create_table 'ons_constituencies', force: :cascade do |t|
    t.string 'ons_id', null: false
    t.string 'name', null: false
    t.datetime 'created_at', null: false
    t.datetime 'updated_at', null: false
    t.index ['ons_id'], name: 'index_ons_constituencies_on_ons_id', unique: true
  end

  create_table 'parties', force: :cascade do |t|
    t.string 'name'
    t.string 'color'
    t.datetime 'created_at', null: false
    t.datetime 'updated_at', null: false
  end

  create_table 'polls', force: :cascade do |t|
    t.integer 'constituency_id'
    t.integer 'party_id'
    t.integer 'votes'
    t.datetime 'created_at', null: false
    t.datetime 'updated_at', null: false
  end

  create_table 'potential_swaps', force: :cascade do |t|
    t.integer 'source_user_id'
    t.integer 'target_user_id'
    t.datetime 'created_at', null: false
    t.datetime 'updated_at', null: false
  end

  create_table 'swaps', force: :cascade do |t|
    t.integer 'chosen_user_id'
    t.boolean 'confirmed'
    t.datetime 'created_at', null: false
    t.datetime 'updated_at', null: false
  end

  create_table 'users', force: :cascade do |t|
    t.string 'provider'
    t.string 'uid'
    t.string 'name'
    t.string 'email'
    t.string 'image'
    t.string 'token'
    t.datetime 'expires_at'
    t.integer 'preferred_party_id'
    t.integer 'willing_party_id'
    t.integer 'constituency_id'
    t.integer 'swap_id'
    t.datetime 'created_at', null: false
    t.datetime 'updated_at', null: false
    t.boolean 'has_voted', default: false
    t.boolean 'sent_vote_reminder_email', default: false
  end
end
