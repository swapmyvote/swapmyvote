class HomeController < ApplicationController
  def index
    if logged_in? && swapping_open?
      redirect_to user_path
      return
    end

    return if session["pre_populate"].nil?

    @parties = Party.all
    @parties.each do |party|
      if canonical_name(party.name) == canonical_name(session["pre_populate"]["preferred_party_name"])
        @preferred_party_id = party.id
      end
      if canonical_name(party.name) == canonical_name(session["pre_populate"]["willing_party_name"])
        @willing_party_id = party.id
      end
    end
  end
end
