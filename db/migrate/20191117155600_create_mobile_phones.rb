class CreateMobilePhones < ActiveRecord::Migration[5.2]
  def change
    create_table :mobile_phones do |t|
      t.references :user, foreign_key: true
      t.string :number
      t.string :verify_id
      t.boolean :verified

      t.timestamps
    end

    add_index :mobile_phones, :number, unique: true
    add_reference :users, :mobile_phone,
                  foreign_key: true, index: { unique: true }
  end
end
