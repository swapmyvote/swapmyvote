class AddNewsEmailConsentToUser < ActiveRecord::Migration[5.2]
  def change
    add_column :users, :consent_news_email, :boolean, null: false, default: false
  end
end
