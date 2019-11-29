class HomeController < ApplicationController
  before_action :whats_the_magic_word

  def index
    if params.key?(:clear) && prepops
      session.delete("pre_populate")
    end

    if logged_in? && swapping_open?
      redirect_to user_path
      return
    end

    @parties = Party.all

    prepopulate_fields_from_session
  end

  private

  def prepopulate_fields_from_session
    return if prepops.nil?

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
    canonical_name(prepops[param])
  end

  def whats_the_magic_word
    if params.key?(:opensesame)
      session[:sesame] = "open"
    elsif params.key?(:closesesame)
      session[:sesame] = "closed"
    end
  end
end
