class AddConsentShareEmailToSwaps < ActiveRecord::Migration[5.2]
  def change
    add_column :swaps, :consent_share_email_chooser, :boolean, default: false, null: false
    add_column :swaps, :consent_share_email_chosen, :boolean, default: false, null: false
  end
end
