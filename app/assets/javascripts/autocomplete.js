$(function() {
  $.widget("custom.combobox", {
    _create: function() {
      this.wrapper = $("<span>")
        .addClass("constituency-autocomplete")
        .insertAfter(this.element);

      this.element.hide();
      this._createAutocomplete();
      this._createShowAllButton();
    },

    _createAutocomplete: function() {
      var element = this.element,
        selected = element.children(":selected"),
        value = selected.val()
          ? selected.text()
          : "Type to select your constituency";

      var input = (this.input = $("<input>")
        .appendTo(this.wrapper)
        .val(value)
        .attr("title", "")
        .addClass(
          "constituency-autocomplete-input ui-widget ui-widget-content ui-state-default ui-corner-left"
        )
        .autocomplete({
          delay: 0,
          minLength: 0,
          source: $.proxy(this, "_source"),
          change: function(event, ui) {
            // Same as autocompletechange below?
          },
          classes: {
            "ui-autocomplete": "constituency-autocomplete-select"
          }
        })
        .tooltip({
          classes: {
            "ui-tooltip": "ui-state-highlight"
          }
        })
        .focus(function() {
          var selected = element.children(":selected");
          if (!selected.val()) {
            input.val("");
          }
        }));

      this._on(this.input, {
        autocompleteselect: function(event, ui) {
          ui.item.option.selected = true;
          $("#txt-postcode").val("");
          this._trigger("select", event, {
            item: ui.item.option
          });
        },

        autocompletechange: "_removeIfInvalid"
      });
    },

    _createShowAllButton: function() {
      var input = this.input,
        wasOpen = false;

      $("<a>")
        .attr("tabIndex", -1)
        .appendTo(this.wrapper)
        .addClass(
          "ui-button ui-widget ui-button-icon-only constituency-autocomplete-toggle ui-corner-right"
        )
        .append("<span class='ui-button-icon ui-icon ui-icon-triangle-1-s' />")
        .on("mousedown", function() {
          wasOpen = input.autocomplete("widget").is(":visible");
        })
        .on("click", function() {
          input.trigger("focus");

          // Close if already visible
          if (wasOpen) {
            return;
          }

          // Pass empty string as value to search for, displaying all results
          input.autocomplete("search", "");
        });
    },

    _source: function(request, response) {
      var matcher = new RegExp(
        $.ui.autocomplete.escapeRegex(request.term),
        "i"
      );
      response(
        this.element.children("option").map(function() {
          var text = $(this).text();
          if (this.value && (!request.term || matcher.test(text)))
            return {
              label: text,
              value: text,
              option: this
            };
        })
      );
    },

    _removeIfInvalid: function(event, ui) {
      // Selected an item, nothing to do
      if (ui.item) {
        return;
      }

      // Search for a match (case-insensitive)
      var value = this.input.val(),
        valueLowerCase = value.toLowerCase(),
        valid = false;
      this.element.children("option").each(function() {
        if (
          $(this)
            .text()
            .toLowerCase() === valueLowerCase
        ) {
          this.selected = valid = true;
          return false;
        }
      });

      // Found a match, nothing to do
      if (valid) {
        return;
      }

      // Remove invalid value
      this.input.val("");
      this.element.val("");
      this._delay(function() {
        this.input.tooltip("close").attr("title", "");
      }, 2500);
      this.input.autocomplete("instance").term = "";
    },

    _destroy: function() {
      this.wrapper.remove();
      this.element.show();
    }
  });

  $("#user_constituency_ons_id").combobox();
});
