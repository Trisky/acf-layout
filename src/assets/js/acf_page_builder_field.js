(function($){
	if (typeof acf == 'undefined') return;

	var Field = acf.Field.extend({
		
		type: 'offbeat_components',
		wait: '',
		
		events: {
			'click [data-name="add-component"]': 		'onClickAdd',
			'click [data-name="remove-component"]': 	'onClickRemove',
			'click [data-name="collapse-component"]': 	'onClickCollapse',
			'showField':							'onShow',
			'unloadField':							'onUnload',
			'mouseover': 							'onHover'
		},
		
		$control: function(){
			return this.$('.acf-flexible-content:first');
		},
		
		$layoutsWrap: function(){
			return this.$('.acf-flexible-content:first > .values');
		},
		
		$layouts: function(){
			return this.$('.acf-flexible-content:first > .values > .component');
		},
		
		$layout: function( index ){
			return this.$('.acf-flexible-content:first > .values > .component:eq(' + index + ')');
		},
		
        $actions: function(){
			return this.$('.acf-actions:last');
		},
		
		$button: function(){
			return this.$('.acf-actions:last .button');
		},
		
		$popup: function(){
			return $('.tmpl-offbeat-components:last');
		},
		
		getPopupHTML: function(){
			
			// vars
			var html = this.$popup().html();
			var $html = $(html);
			
			// count layouts
			var $layouts = this.$layouts();
			var countLayouts = function( name ){
				return $layouts.filter(function(){
					return $(this).data('layout') === name;
				}).length;
			};
					
			// update
			html = $html.outerHTML();
			
			// return
			return html;
		},
		
		getValue: function(){
			return this.$layouts().length;
		},
		
		allowRemove: function(){
			var min = parseInt( this.get('min') );
			return ( !min || min < this.val() );
		},
		
		allowAdd: function(){
			var max = parseInt( this.get('max') );
			return ( !max || max > this.val() );
		},
		
		isFull: function(){
			var max = parseInt( this.get('max') );
			return ( max && this.val() >= max );
		},
		
		addSortable: function( self ){
			
			// bail early if max 1 row
			if( this.get('max') == 1 ) {
				return;
			}
			
			// add sortable
			this.$layoutsWrap().sortable({
				items: '> .layout',
				handle: '> .acf-fc-layout-handle',
				forceHelperSize: true,
				forcePlaceholderSize: true,
				scroll: true,
	   			stop: function(event, ui) {
					self.render();
	   			},
	   			update: function(event, ui) {
		   			self.$input().trigger('change');
		   		}
			});
		},
		
		addCollapsed: function(){
			
			// vars
			var indexes = preference.load( this.get('key') );
			
			// bail early if no collapsed
			if( !indexes ) {
				return false;
			}
			
			// loop
			this.$layouts().each(function( i ){
				if( indexes.indexOf(i) > -1 ) {
					$(this).addClass('-collapsed');
				}
			});
		},
		
		addUnscopedEvents: function( self ){
			
			// invalidField
			this.on('invalidField', '.layout', function(e){
				self.onInvalidField( e, $(this) );
			});
		},
		
		initialize: function(){
			
			// add unscoped events
			this.addUnscopedEvents( this );
			
			// add collapsed
			this.addCollapsed();
			
			// disable clone
			// acf.disable( this.$clonesWrap(), this.cid );
						
			// render
			this.render();
		},
		
		render: function(){
			
			// update order number
			this.$layouts().each(function( i ){
				$(this).find('.acf-fc-layout-order:first').html( i+1 );
			});
			
            // empty

			if( this.val() == 0 ) {
				this.$control().addClass('-empty');
			} else {
				this.$control().removeClass('-empty');
			}
			
			// max
			if( this.isFull() ) {
				this.$button().addClass('disabled');
			} else {
				this.$button().removeClass('disabled');
			}
		},
		
		onShow: function( e, $el, context ){
			
			// get sub fields
			var fields = acf.getFields({
				is: ':visible',
				parent: this.$el,
			});
			
			// trigger action
			// - ignore context, no need to pass through 'conditional_logic'
			// - this is just for fields like google_map to render itself
			acf.doAction('show_fields', fields);
		},
		
		validateAdd: function(){
			
			// return true if allowed
			if( this.allowAdd() ) {
				return true;
			}
			
			// vars
			var max = this.get('max');
			var text = acf.__('This field has a limit of {max} {label} {identifier}');
			var identifier = acf._n('layout', 'layouts', max);
			
			// replace
			text = text.replace('{max}', max);
			text = text.replace('{label}', '');
			text = text.replace('{identifier}', identifier);
			
			// add notice
			this.showNotice({
				text: text,
				type: 'warning'
			});
			
			// return
			return false;
		},
		
		onClickAdd: function( e, $el ){
			// validate
			if( !this.validateAdd() ) {
				return false;
			}
			
			// within layout
			var $layout = null;
			if( $el.hasClass('acf-icon') ) {
				$layout = $el.closest('.layout');
				$layout.addClass('-hover');
			}
            
			// new popup
			var popup = new Popup({
				target: $el,
				targetConfirm: false,
				text: this.getPopupHTML(),
				context: this,
				confirm: function( e, $el ){
					// check disabled
					if( $el.hasClass('disabled') ) {
						return;
					}

					// add
					this.add({
						component: $el.data('component'),
						before: $layout
					});
				},
				cancel: function(){
					if( $layout ) {
						$layout.removeClass('-hover');
					}
					
				}
			});
			
			// add extra event
			popup.on('click', '[data-component]', 'onConfirm');
		},
		
		add: function( args ){
			
			// defaults
			args = acf.parseArgs(args, {
				layout: '',
				before: false
			});
            
			// validate
			if( !this.allowAdd() ) {
				return false;
            }

            
            // Load field HTML
            var fieldHtml = '';
            $.ajax({
                url: ajaxurl,
                data: {
                    action: 'get_component_field_html',
                    component: args.component
                },
                dataType: 'html',
                success: function (html) {
                    fieldHtml = html;
                },
                async: false
            });

			// add row
			var $el = acf.duplicate({
				target: $(fieldHtml),
				append: this.proxy(function( $el, $el2 ){
					// append
					if( args.before ) {
						args.before.before( $el2 );
					} else {
						this.$layoutsWrap().append( $el2 );
					}
					
					// enable 
					acf.enable( $el2, this.cid );
					
					// render
					this.render();
				})
			});
			
			// trigger change for validation errors
			this.$input().trigger('change');
			
			// return
			return $el;
		},
		
		validateRemove: function(){
			
			// return true if allowed
			if( this.allowRemove() ) {
				return true;
			}
			
			// vars
			var min = this.get('min');
			var text = acf.__('This field requires at least {min} {label} {identifier}');
			var identifier = acf._n('layout', 'layouts', min);
			
			// replace
			text = text.replace('{min}', min);
			text = text.replace('{label}', '');
			text = text.replace('{identifier}', identifier);
			
			// add notice
			this.showNotice({
				text: text,
				type: 'warning'
			});
			
			// return
			return false;
		},
		
		onClickRemove: function( e, $el ){
			
			// vars
			var $layout = $el.closest('.layout');
			
			// add class
			$layout.addClass('-hover');
			
			// add tooltip
			var tooltip = acf.newTooltip({
				confirmRemove: true,
				target: $el,
				context: this,
				confirm: function(){
					this.removeLayout( $layout );
				},
				cancel: function(){
					$layout.removeClass('-hover');
				}
			});
		},
		
		removeLayout: function( $layout ){
			
			// reference
			var self = this;
			
			// vars
			var endHeight = this.getValue() == 1 ? 60: 0;
			
			// remove
			acf.remove({
				target: $layout,
				endHeight: endHeight,
				complete: function(){
					
					// trigger change to allow attachment save
					self.$input().trigger('change');
				
					// render
					self.render();
				}
			});
		},
		
		onClickCollapse: function( e, $el ){
			
			// vars
			var $layout = $el.closest('.layout');
			
			// toggle
			if( this.isLayoutClosed( $layout ) ) {
				this.openLayout( $layout );
			} else {
				this.closeLayout( $layout );
			}
		},
		
		isLayoutClosed: function( $layout ){
			return $layout.hasClass('-collapsed');
		},
		
		openLayout: function( $layout ){
			$layout.removeClass('-collapsed');
			acf.doAction('show', $layout, 'collapse');
		},
		
		closeLayout: function( $layout ){
			$layout.addClass('-collapsed');
			acf.doAction('hide', $layout, 'collapse');
			
			// render
			// - no change could happen if layout was already closed. Only render when closing
			this.renderLayout( $layout );
		},
		
		renderLayout: function( $layout ){
			
		},
		
		onUnload: function(){
			
			// vars
			var indexes = [];
			
			// loop
			this.$layouts().each(function( i ){
				if( $(this).hasClass('-collapsed') ) {
					indexes.push( i );
				}
			});
			
			// allow null
			indexes = indexes.length ? indexes : null;
			
			// set
			preference.save( this.get('key'), indexes );
		},
		
		onInvalidField: function( e, $layout ){
			
			// open if is collapsed
			if( this.isLayoutClosed( $layout ) ) {
				this.openLayout( $layout );
			}
		},
		
		onHover: function(){
			
			// add sortable
			this.addSortable( this );
			
			// remove event
			this.off('mouseover');
		}
						
	});
	
	acf.registerFieldType( Field );
	
	
	
	/**
	*  Popup
	*
	*  description
	*
	*  @date	7/4/18
	*  @since	5.6.9
	*
	*  @param	type $var Description. Default.
	*  @return	type Description.
	*/
	
	var Popup = acf.models.TooltipConfirm.extend({
		
		events: {
			'click [data-layout]': 			'onConfirm',
			'click [data-event="cancel"]':	'onCancel',
		},
		
		render: function(){
			
			// set HTML
			this.html( this.get('text') );
			
			// add class
			this.$el.addClass('acf-fc-popup');
		}		
	});
	
	
	/**
	*  conditions
	*
	*  description
	*
	*  @date	9/4/18
	*  @since	5.6.9
	*
	*  @param	type $var Description. Default.
	*  @return	type Description.
	*/
	
	// register existing conditions
	acf.registerConditionForFieldType('hasValue', 'flexible_content');
	acf.registerConditionForFieldType('hasNoValue', 'flexible_content');
	acf.registerConditionForFieldType('lessThan', 'flexible_content');
	acf.registerConditionForFieldType('greaterThan', 'flexible_content');
	
	
	// state
	var preference = new acf.Model({
		
		name: 'this.collapsedLayouts',
		
		key: function( key, context ){
			
			// vars
			var count = this.get(key+context) || 0;
			
			// update
			count++;
			this.set(key+context, count, true);
			
			// modify fieldKey
			if( count > 1 ) {
				key += '-' + count;
			}
			
			// return
			return key;
		},
		
		load: function( key ){
			
			// vars 
			var key = this.key(key, 'load');
			var data = acf.getPreference(this.name);
			
			// return
			if( data && data[key] ) {
				return data[key]
			} else {
				return false;
			}
		},
		
		save: function( key, value ){
			
			// vars 
			var key = this.key(key, 'save');
			var data = acf.getPreference(this.name) || {};
			
			// delete
			if( value === null ) {
				delete data[ key ];
			
			// append
			} else {
				data[ key ] = value;
			}
			
			// allow null
			if( $.isEmptyObject(data) ) {
				data = null;
			}
			
			// save
			acf.setPreference(this.name, data);
		}
	});
	
})(jQuery);