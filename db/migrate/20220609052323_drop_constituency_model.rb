class DropConstituencyModel < ActiveRecord::Migration[5.2]
  def up
    drop_table :constituencies
  end

  def down
    create_table "constituencies", force: :cascade do |t|
      t.string "name"
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
    end
  end
end
