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

ActiveRecord::Schema.define(version: 2019_11_26_222547) do

  create_table "constituencies", force: :cascade do |t|
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "mobile_phones", force: :cascade do |t|
    t.integer "user_id"
    t.string "number"
    t.string "verify_id"
    t.boolean "verified"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["number"], name: "index_mobile_phones_on_number", unique: true
    t.index ["user_id"], name: "index_mobile_phones_on_user_id"
  end

  create_table "ons_constituencies", force: :cascade do |t|
    t.string "ons_id", null: false
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["ons_id"], name: "index_ons_constituencies_on_ons_id", unique: true
  end

  create_table "parties", force: :cascade do |t|
    t.string "name"
    t.string "color"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "polls", force: :cascade do |t|
    t.integer "old_constituency_id"
    t.integer "party_id"
    t.integer "votes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "constituency_ons_id"
  end

  create_table "potential_swaps", force: :cascade do |t|
    t.integer "source_user_id"
    t.integer "target_user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "sent_emails", force: :cascade do |t|
    t.integer "user_id"
    t.string "template"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_sent_emails_on_user_id"
  end

  create_table "swaps", force: :cascade do |t|
    t.integer "chosen_user_id"
    t.boolean "confirmed"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "users", force: :cascade do |t|
    t.string "provider"
    t.string "uid"
    t.string "name"
    t.string "email"
    t.string "image"
    t.string "token"
    t.datetime "expires_at"
    t.integer "preferred_party_id"
    t.integer "willing_party_id"
    t.integer "old_constituency_id"
    t.integer "swap_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "has_voted", default: false
    t.boolean "sent_vote_reminder_email", default: false
    t.string "constituency_ons_id"
    t.integer "mobile_phone_id"
    t.index ["mobile_phone_id"], name: "index_users_on_mobile_phone_id", unique: true
  end

  create_table "users_social_profiles", force: :cascade do |t|
    t.integer "user_id"
    t.integer "provider"
    t.string "nickname"
    t.string "uid"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_users_social_profiles_on_user_id"
  end

end
