# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 2024_06_16_111118) do

  create_table "identities", force: :cascade do |t|
    t.integer "user_id"
    t.integer "provider"
    t.string "name"
    t.string "uid"
    t.string "image_url"
    t.string "email"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "profile_url"
    t.string "password_digest"
    t.index ["user_id"], name: "index_identities_on_user_id"
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
    t.string "smv_code"
  end

  create_table "polls", force: :cascade do |t|
    t.integer "old_constituency_id"
    t.integer "party_id"
    t.integer "votes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "constituency_ons_id"
    t.integer "marginal_score"
    t.index ["constituency_ons_id", "party_id"], name: "index_polls_on_constituency_ons_id_and_party_id", unique: true
    t.index ["party_id", "marginal_score"], name: "index_polls_on_party_id_and_marginal_score"
  end

  create_table "potential_swaps", force: :cascade do |t|
    t.integer "source_user_id"
    t.integer "target_user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "recommendations", force: :cascade do |t|
    t.string "text"
    t.string "link"
    t.string "site", null: false
    t.string "constituency_ons_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["constituency_ons_id", "site"], name: "index_recommendations_on_constituency_ons_id_and_site", unique: true
  end

  create_table "recommended_parties", force: :cascade do |t|
    t.string "text"
    t.string "link"
    t.string "site", null: false
    t.string "constituency_ons_id", null: false
    t.integer "party_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["constituency_ons_id", "site", "party_id"], name: "index_recommended_parties_on_constituency_site_party", unique: true
    t.index ["party_id"], name: "index_recommended_parties_on_party_id"
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
    t.boolean "consent_share_email_chooser", default: false, null: false
    t.boolean "consent_share_email_chosen", default: false, null: false
  end

  create_table "users", force: :cascade do |t|
    t.string "name"
    t.string "email"
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
    t.integer "mobile_phone_id"
    t.string "constituency_ons_id"
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.boolean "consent_news_email", default: false, null: false
    t.index ["mobile_phone_id"], name: "index_users_on_mobile_phone_id", unique: true
    t.index ["preferred_party_id", "willing_party_id", "constituency_ons_id"], name: "index_users_on_complementary_users"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

end
