class HomeController < ApplicationController
  def index
    if logged_in? && swapping_open?
      redirect_to user_path
      return
    end

    @parties = Party.all

    prepopulate_fields_from_session
  end

  private

  def prepopulate_fields_from_session
    prepop = session["pre_populate"]
    return if prepop.nil?

    @parties.each do |party|
      if canonical_name(party.name) == prepopulated_party("preferred_party_name")
        @preferred_party_id = party.id
      end
      if canonical_name(party.name) == prepopulated_party("willing_party_name")
        @willing_party_id = party.id
      end
    end
  end

  def prepopulated_party(param)
    canonical_name(session["pre_populate"][param])
  end
end
