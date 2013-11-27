
/* Widget for the Share Dialog */

cdb.admin.mod.LegendWidget = cdb.core.View.extend({

  className: "cartodb-legends",

  initialize: function() {

    this.map = this.options.map;
    this._setupTemplates();

    this.map.layers.bind("change", this.render, this);

  },

  _setupTemplates: function() {

    this.template = _.template('<%= count %> active legend<%= (count == 1) ? "" : "s" %>');

  },

  _getLegends: function() {

    var self = this;

    var legends = [];

    _.each(this.map.layers.models, function(layer) {

      if (layer.get("type") == 'layergroup') {

        var layerGroupView = self.mapView.getLayerByCid(layer.cid);

        for (var i = 0 ; i < layerGroupView.getLayerCount(); ++i) {
          var l = layerGroupView.getLayer(i);

          legends.push(new cdb.geo.ui.Legend({
            type: l.legend.get("type"),
            data: l.legend.items.toJSON()
          }));

        }

      } else if (layer.get("type") == "CartoDB") {

        legends.push(new cdb.geo.ui.Legend({
          type: layer.legend.get("type"),
          data: layer.legend.items.toJSON()
        }));

      }

    });

    return legends;
  },

  _getLegendsCount: function() {

    var count = 0;

    _.each(this.map.layers.models, function(layer) {

      if (layer.get("type") == 'layergroup') {

        var layerGroupView = this.mapView.getLayerByCid(layer.cid);

        for (var i = 0 ; i < layerGroupView.getLayerCount(); ++i) {

          var l = layerGroupView.getLayer(i);

          if (l.legend.items.length > 0 && l.get("visible") && l.legend.get("type") != null) {
            count++;
          }
        }

      } else if (layer.get("type") == "CartoDB" && layer.get("visible") && layer.legend.get("type") != null) {

        if (layer.legend.items.length > 0) {
          count++;
        }

      }

    }, this);

    return count;
  },

  render: function() {

    this.$el.html(this.template({ count: this._getLegendsCount() }));

    return this;

  }

});



cdb.admin.mod.LegendEditorCollection = Backbone.Collection.extend({ });

cdb.admin.mod.LegendEditorItem = cdb.core.View.extend({

  tagName: "li",

  events: {

    "click .title": "_onClickTitle",
    "click .sync": "_onClickSync",
    "click .remove": "_removeItem"

  },

  initialize: function() {

    _.bindAll(this, "_onChangeTitle", "_onToggleShowTitle", "_onToggleSync");

    this.template = this.options.template_name ? this.getTemplate(this.options.template_name) : this.getTemplate('table/menu_modules/legends/views/legend_item');

    this.add_related_model(this.model);

    this.removable   = this.options.removable === undefined ? true : false;
    this.title       = this.options.title === undefined ? "" : this.options.title;
    this.showSwitch  = this.options.showSwitch === undefined ? "" : this.options.showSwitch;

    this.model.bind("change:title", this._onChangeTitle);
    this.model.bind("change:show_title", this._onToggleShowTitle);
    this.model.bind("change:sync", this._onToggleSync);

  },

  render: function() {
    var values = _.extend( this.model.toJSON(), { title: this.title, sync: this.model.get("sync"), show_switch: this.showSwitch, removable: this.removable });
    this.$el.append(this.template(values));

    this._addEditInPlace();

    if (!this.title) this._addColorForm();

    return this;
  },

  _onToggleSync:function() {

    if (this.model.get("sync")) this.$el.find(".checkbox.sync").addClass("enabled");
    else this.$el.find(".checkbox.sync").removeClass("enabled");

  },

  _onChangeTitle:function() {

    if (this.model.get("title") && !this.model.get("show_title")) this.model.set("show_title", true);
    else if (!this.model.get("title") && this.model.get("show_title")) this.model.set("show_title", false);

  },

  _onToggleShowTitle:function() {

    if (this.model.get("show_title")) this.$el.find(".title").addClass("enabled");
    else this.$el.find(".title").removeClass("enabled");

  },

  _onClickSync: function(e) {
    e.preventDefault();
    e.stopPropagation();

    this.model.set("sync", !this.model.get("sync"));

  },

  _onClickTitle: function(e) {
    e.preventDefault();
    e.stopPropagation();

    this.model.set("show_title", !this.model.get("show_title"));
  },

  _removeItem: function(e) {
    e.preventDefault();
    e.stopPropagation();

    this.trigger('remove', this);

  },

  _addEditInPlace: function() {
    var self = this;

    this.editInPlace = new cdb.admin.EditInPlace({
      observe: this.options.observe,
      model: this.model,
      maxWidth: this.options.maxWidth,
      stripHTML: true,
      el: this.$el.find(".input")
    });

    // Set custom_value to true if value was added
    // manually
    this.editInPlace.bind("change", function(val) {
      if (this.model.get('name') == "Left label" || this.model.get('name') == "Right label") {
        this.model.set('custom_value', true);
      }
    })

    this.addView(this.editInPlace);

  },

  _addColorForm: function() {

    if (this.options.filter_type == 'category' || this.options.filter_type == 'color' || this.options.filter_type == 'custom') {

      var self = this;

      // Generate a temp model for the color/file
      var tempModel = new cdb.core.Model();

      var value  = this.model.get("value") || "";
      var hasURL = value.indexOf("http") != -1;
      var color  = hasURL ? "" : value;
      var file   = hasURL ? value : "";

      tempModel.set({ color: color, file: file });

      // Bind it to our item
      tempModel.bind("change:color change:file", function(model) {
        var changed =  model.changed.color || model.changed.file;

        if (changed) {
          self.model.set("value", changed);
        }

      });

      var view = new cdb.forms.Color({
        model: tempModel,
        property: 'color',
        extra: {
          image_property: 'file'
        }
      });

    } else {
      var view = new cdb.forms.Color({
        model: this.model,
        property: 'value'
      });
    }

    this.$el.find('span.field').append(view.render().el);
    this.addView(view);

  }

});

cdb.admin.mod.LegendEditor = cdb.admin.Module.extend({

  type: 'tool',
  buttonClass: 'legends_mod',
  className: 'legends_panel',

  initialize: function() {

    this.template = this.getTemplate('table/menu_modules/legends/views/legends');

    //this._setupModel();
    this._setupPanes();
    this._setupBindings();
    this._setupStorage();

  },

  _setupModel: function() {
    this.add_related_model(this.model);
  },

  _setupPanes: function() {

    //if (this.panes) this.panes.clean();

    this.panes = new cdb.ui.common.TabPane({
      activateOnClick: true
    });

    this.addView(this.panes);

  },

  _setupBindings: function() {

    this.options.dataLayer.bind("change:wizard_properties", this._onWizardChange, this);
    this.add_related_model(this.options.dataLayer);

    this.dataLayer = this.options.dataLayer;

  },

  _add: function() {

    //console.log("addd")

    if (this.currentLegendPane) {

      this.currentLegendPane.render();
      if (this.currentLegendPane.items) {
        this.model.set("items", this.currentLegendPane.items.toJSON());
      }

      this._saveState();
    }

  },

  _setupStorage: function() {
    version = "_3.0";
    this.storageKey = this.dataLayer.get("table_name") + version;
    this.savedItems = new cdb.admin.localStorage(this.storageKey);
  },

  _saveState: function() {
    if (this.currentLegendPane._FILTER_NAME == 'custom') {
      //console.log('saving state')
      this._saveItems();
    }
  },

  _saveItems: function() {
    this.savedItems.set(this.currentLegendPane.items);
  },

  _getSavedItems: function() {
    return this.savedItems.get();
  },

  _loadSavedItems: function() {
    //console.log('loading items');

    var items = this.savedItems.get();

    if (items) {
      this.currentLegendPane.items.reset(items);
    }
  },

  _shallResetPanes: function() {

    var legendType = this.model.get("type");
    var wizardType = this.options.dataLayer.get("wizard_properties").type;

    return (legendType != "null" && legendType != "custom" && legendType != wizardType);

  },

  _activateTemplate: function(name) {

    //console.log("activating template: ", name);

    var enablingLegends  = ["none", "custom", name];
    var availableLegends = this.options.legends;

    _.each(availableLegends, function(legend) {
      legend.enabled = _.contains(enablingLegends, legend.name) ? true : false;
    });

  },

  _bindActivePane: function() {

    var tab = this.panes.getActivePane();
    if (tab && tab._bindItems) tab._bindItems();

  },

  _unbindActivePane: function() {

    var tab = this.panes.getActivePane();
    if (tab && tab._unbindItems) tab._unbindItems();

  },

  _rebind: function(type) {

    this.panes.active(type);
    this.currentLegendPane = this.panes.getActivePane();

    if (this.currentLegendPane && this.currentLegendPane.items) {
      this.currentLegendPane.items.unbind("change reset remove add", this._add);
      this.currentLegendPane.items.bind("change reset remove add", this._add, this);
    }

  },

  _loadTab: function(type) {

    //console.log('loading tab', type);

    this._rebind(type);

    //this._unbindActivePane();
    //this.model.set("type", type);
    //this._bindActivePane();

    //this.currentLegendPane.render();
    this.currentLegendPane.wizardProperties = this.dataLayer.get("wizard_properties");

    if (type == 'custom') {
      this._loadSavedItems();
    } else this.currentLegendPane._calculateItems();

  },

  _onWizardChange: function() {

    //console.log('changing wizard')

    var type = this.options.dataLayer.get("wizard_properties").type;

    var paneExists = _.contains(this._getPanes(), type);

    //console.log("Changing to", type, paneExists);

    if (type == "polygon" && this.model.get("type") == "custom") {

      return;

    } else if (!paneExists) {

      type = "none";
    }

    this._activateTemplate(type);
    this._refreshTemplateCombo();
    this._rebind(type);
    this.currentLegendPane.wizardProperties = this.dataLayer.get("wizard_properties");

    if (type == 'custom') {
      this._loadSavedItems();
    } else this.currentLegendPane._calculateItems();

    this.model.set("type", type);

  },

  _getPanes: function() {

    var legends = this.options.legends;
    return _.pluck(legends, 'name');

  },

  _getEnabledPanes: function() {

    var legends = _.filter(this.options.legends, function(legend) {
      return legend["enabled"];
    });

    return _.pluck(legends, 'name');

  },

  _refreshTemplateCombo: function() {

    var legends = this._getEnabledPanes();
    this.templates.updateData(legends);

  },

  // Renders the combo that allows to choose a legend

  _renderTemplateCombo: function() {

    //if (this.templates) this.templates.clean();

    this.templates = new cdb.forms.Combo({
      property: 'type',
      extra: this._getEnabledPanes(),
      model: this.model
    });

    this.addView(this.templates);

    this.templates.unbind("change", this._loadTab, this);
    this.templates.bind("change", this._loadTab, this);

    var $f = this.$('.fields');
    var li = $('<li>');

    li
    .append(this.templates.render().el)
    .append('<span>Template</span>');

    $f.append(li);

  },

  _capitalize: function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },

  _getExtraLegendNames: function() {

    var wizardProperties = this.dataLayer.get("wizard_properties");

    if (wizardProperties) {
      var wizardName = wizardProperties.type;
      return _.intersection(this.options.extraLegends, [wizardName]);
    } else {
      return null;
    }

  },

  /* Render panes */
  _renderPanes: function() {

    //this.clearSubViews();

    var enabledLegends = _.pluck(this.options.legends, "name");

    _.each(enabledLegends, this._renderPane, this);

  },

  _renderPane: function(name) {

    var legendClass = this._capitalize(name + "Legend");

    var tab = new cdb.admin.mod[legendClass]({
      model: this.model,
      table_id: this.options.dataLayer.get("id"),
      wizardProperties: this.dataLayer.get("wizard_properties")
    });

    this.panes.addTab(name, tab);

    tab.$el.addClass(name);

  },

  render: function() {

    this.clearSubViews();
    this.$el.html(this.template);

    this.panes.setElement(this.$('.forms'));

    this._renderPanes();

    //this._unbindActivePane();

    var type = this.model.get("type") || "none";
    this._rebind(type);

    if (type && this.currentLegendPane.model.get("type")) {

      this.currentLegendPane.wizardProperties = this.dataLayer.get("wizard_properties");
      this.currentLegendPane.render();
      this._activateTemplate(type);

      this.currentLegendPane.refresh(this.model.items.models);


    }

    if (this.options.dataLayer.get("wizard_properties")) {
      var type = this.options.dataLayer.get("wizard_properties").type;
      this._activateTemplate(type);
    }

    //console.log('default tab', tab);

    this._renderTemplateCombo();

    return this;
  }

});

/**
 * NoneLegend
 */
cdb.admin.mod.NoneLegend = cdb.core.View.extend({

  _FILTER_NAME: "none",

  initialize: function() {

    this._setupTemplates();
    this.render();

  },

  _setupTemplates: function() {

    this.template           = this.getTemplate('table/menu_modules/legends/views/none_legend_pane');

  },

  _calculateItems: function() {

    this.model.items.reset();
    this.model.set("type", "none");

  },

  refresh: function() {

  },

  render: function() {
    this.clearSubViews();

    this.$el.html(this.template);
    this.$el.find(".no_content").show();

    return this;
  }

});

/**
 * CustomLegend
 */
cdb.admin.mod.CustomLegend = cdb.core.View.extend({

  _FILTER_NAME: "custom",

  events: {

    "click .add": "_addItem"

  },

  initialize: function() {

    this._setupTemplates();
    this.wizardProperties = this.options.wizardProperties;

    this.items = this.model.items;

    this.add_related_model(this.items);

  },

  _setupTemplates: function() {

    this.template           = this.getTemplate('table/menu_modules/legends/views/custom_legend_pane');
    this.item_template_name = 'table/menu_modules/legends/views/custom_legend_item'

  },

  refresh: function() { },

  _unbindItems: function() {

    //this.items.unbind("add remove reset change", this.render, this);

  },

  _bindItems: function() {
    //console.log('xxxx binding')

    //this._unbindItems();
    //this.items.bind("add remove reset change", this.render, this);
  },

  _calculateItems: function() {

  },

  _addItem: function(e) {

    e && e.preventDefault();
    e && e.stopPropagation();

    var item = new cdb.geo.ui.LegendItemModel({ name: "Untitled", value: "#cccccc", sync: true });

    this.items.add(item);
    //console.log('adding item');

  },

  _renderItems: function() {

    if (this.items.length > 0) {
      this.$el.find(".no_content").hide();
      this.items.each(this._renderItem, this);
      this.titleEditor.show();
    } else {
      this.$el.find(".no_content").show();
      this.titleEditor.hide();
    }

  },

  _renderItem: function(item) {

    var view = new cdb.admin.mod.LegendEditorItem({
      model: item,
      observe: "name",
      filter_type: this._FILTER_NAME,
      template_name: this.item_template_name
    });

    view.bind("remove", this._removeItem, this);

    this.$el.find("ul").append(view.render().$el);
    this.addView(view);

  },

  _removeItem: function(item) {
    this.items.remove(item.model);
  },

  render: function() {

    this.clearSubViews();

    this.titleEditor = new cdb.admin.mod.LegendEditorItem({
      className: "title",
      model: this.model,
      observe: "title",
      title: "Title",
      maxWidth: 120,
      showSwitch: true,
      removable: false,
      template_name: 'table/menu_modules/legends/views/custom_legend_item'
    });

    this.$el.html(this.template);

    this.$el.find("ul").append(this.titleEditor.render().$el);
    this.addView(this.titleEditor);

    //console.log('rendering', this._FILTER_NAME);
    this._renderItems();

    return this;
  }

});
