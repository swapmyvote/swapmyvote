module HomeHelper
  def pre_login_flow
    return session["pre_login_flow"] || {}
  end

  def pre_login_constituency_form_complete
    params["constituency_ons_id"] && !params["constituency_ons_id"].empty?
  end

  def pre_login_candidates_form_complete
    !!pre_login_flow["candidates_form_complete"]
  end

  def mark_pre_login_constituency_complete
    session["pre_login_flow"] ||= {}
    session["pre_login_flow"]["constituency_form_complete"] = true
  end

  def mark_pre_login_parties_complete
    session["pre_login_flow"] ||= {}
    session["pre_login_flow"]["parties_form_complete"] = true
  end
end
