module HomeHelper
  def pre_login_flow
    return session["pre_login_flow"] || {}
  end

  def pre_login_constituency_form_complete
    !!pre_login_flow["constituency_form_complete"]
  end

  def pre_login_candidates_form_complete
    !!pre_login_flow["candidates_form_complete"]
  end

  def set_pre_login_constituency(ons_id)
    session["pre_populate"] ||= {}
    session["pre_login_flow"] ||= {}
    session["pre_populate"]["constituency"] = ons_id
    session["pre_login_flow"]["constituency_form_complete"] = true
  end

  def set_pre_login_parties(user)
    session["pre_populate"] ||= {}
    session["pre_login_flow"] ||= {}
    session["pre_populate"]["willing_party_id"] = user["willing_party_id"]
    session["pre_populate"]["preferred_party_id"] = user["preferred_party_id"]
    session["pre_login_flow"]["parties_form_complete"] = true
  end

end
