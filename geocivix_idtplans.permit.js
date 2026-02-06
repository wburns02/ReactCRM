'use strict';

// ensure existence of namespace
var idtplans = idtplans || {};

// forms library
idtplans.permit = {};

// form association module
idtplans.permit = {

	controller: null,

	init: function() {
		var self = idtplans.permit;
		var doc = $('#mainContainer');

		// controller with base
		self.controller = new idtplans.Controller({
			baseURL   : '/secure/',
			section   : 'permit',
			container : '#project-permits-expand-container'
		});

		// bind events
		doc.on('click', '.permit-action', self.exec);
		doc.on('change', '#permit-type-select', self.selections);
		doc.on('change', '.permit-status', self.status);
		doc.on('change', '#permit-date-range-operator', self.formatDateRange);
		doc.on('change', '.permit-contact', self.contact);
		doc.on('change', '.permit-description', self.description);

		//permit search init
		if (doc.find('permit-search-form')) {
			self.searchInit();
		}

		if(doc.find('#permit-type-select').length) {
			doc.find('#permit-type-select').change();
		}
	},

	exec: function(e) {
		e.preventDefault();
		var self = idtplans.permit;
		var target = $(e.target).closest('.permit-action');
		var data = target.data();
		var params = idtplans.url.params();
		var fn = data.fn || null;

		$.extend(data, params);

		if(!data.ptid) {
			data.ptid = $('input[name=ptid]').val() || 0;
		}

		if(fn && self.hasOwnProperty(fn)) {
			self[fn](e, target, data);
		}
	},

	load: function() {
		var self = idtplans.permit;
		var params = idtplans.url.params();
		var container = $('#project-permits-expand-container');

		if(container.length) {
			params.permitsexpanded = 1;
			self.controller.view('list', params).done(function() {
				idtplans.ui.popover(self.controller.container);
			});
		} else {
			window.location.reload();
		}
	},

	selections: function(e) {
		//work around to prevent initial page load change event firing
		if($(e.target).data('ready')) {
			var self = idtplans.permit;
			var params = idtplans.url.params();
			var div = $('#permit-type-selections');

			params.permittypeid = e.target.value;
			params.copyid = params.issuanceid || 0;

			// load available fees and inspections and form data
			self.controller.action('permittype.check-selections', params).done(function(res) {
				div.html(res);
				//reinitialize all editor text boxes (if new ones present they need initialized)
				idtplans.editor.init();
			});
		}
	},

	locations: function(e, target, data) {
		var self = idtplans.permit;
		var dialog = idtplans.dialog;
		var params = {
			issuanceid : data.issuanceid || 0,
			projectid  : data.projectid || 0
		};

		dialog.show({
			title: 'Select Address',
			view: {
				name : 'permit.location-select',
				data : params
			},
			ui: {
				static: true
			},
			buttons: {
				accept  : 'Save',
				decline : 'Cancel'
			}
		});

		// save and display selection
		dialog.on('click', '.btn-primary', function() {
			var field = dialog.find('select[name=permitaddress]');
			var address = field.val();

			if(address.length) {
				target.closest('.form-group').find('input').val(address);
				dialog.hide();
			}
		});
	},

	status: function(e) {
		var self = idtplans.permit;
		var target = $(e.target);
		var row = target.closest('tr');
		var data = target.data();
		var milestones = $('#permit-milestones');
		var msg;

		data.statusid = target.val();

		if(!row.length) {
			row = target.closest('div');
		}

		self.controller.action('status', data, {
			method: 'POST'
		}).done(function(res) {
			if(res.SUCCESS) {
				msg = 'Status Saved';
				if(milestones.length) {
					var params = idtplans.url.params();
					var ctl = new idtplans.Controller({
						baseURL   : '/secure/',
						section   : 'permit',
						container : milestones
					});
					ctl.view('milestones', params);
				}
			} else {
				msg = 'Error saving status';
			}
			idtplans.tooltip.show(row, {
				content: msg,
				timeout: 5000
			});
		}).fail(function() {
			idtplans.tooltip.show(row, {
				content: 'Service Error',
				timeout: 5000
			});
		});
	},

	statustype: function(e, target, data) {
		var self = idtplans.permit;

		if(data.expire) {
			if(confirm('Are you sure you wish to delete this status?')) {
				self.controller.action('statustype', data, {
					method: 'POST'
				}).done(function(res) {
					target.closest('tr').remove();
				});
			}
		} else {
			var dialog = idtplans.dialog;
			var title = data.statusid ? 'Edit Permit Status' : 'Add Permit Status';

			dialog.show({
				title: title,
				view: {
					name : 'permit.status-edit',
					data : data
				},
				ui: {
					static: true
				},
				buttons: {
					accept  : 'Save',
					decline : 'Cancel'
				}
			});

			// load popovers
			dialog.on('dialogcontentready', function() {
				dialog.find('.popover-hover').popover({trigger: 'hover click', placement: 'auto', container: 'body'});
			});

			dialog.on('click', '.btn-primary', function() {
				var form = dialog.find('form[name=status-form]');
				var name = form.find('input[name=name]');
				var desc = form.find('input[name=description]');
				var params = form.serializeArray();

				dialog.find('.has-error').removeClass('has-error');

				if(!name.val().length) {
					name.closest('.form-group').addClass('has-error');
				}

				if(!desc.val().length) {
					desc.closest('.form-group').addClass('has-error');
				}

				if(dialog.find('.has-error').length) {
					return false;
				}

				self.controller.action('statustype', params, {
					method: 'POST'
				}).always(function() {
					window.location.reload();
				});
			});
		}
	},

	expire: function(e, target, data) {
		var self = idtplans.permit;

		if(data.service && confirm('Are you sure you wish to delete this record?')) {
			self.controller.action(data.service, data, {
				method: 'POST'
			}).done(function(res) {
				if(res.SUCCESS) {
					if(idtplans.layout) {
						//idtplans.project.prompt();
						idtplans.layout.reload();
						idtplans.panel.counts();
					} else {
						self.load();
						idtplans.project.messages();
						idtplans.project.inspections();
					}
				} else {
					idtplans.tooltip.show(target, {
						content : 'Error removing record',
						timeout : 5000
					});
				}
			}).fail(function() {
				idtplans.tooltip.show(target, {
					content : 'Service Error',
					timeout : 5000
				});
			});
		}
	},

	expires: function(e, target, data) {
		var self = idtplans.permit;
		var dialog = idtplans.dialog;

		dialog.show({
			title: 'Edit Expiration',
			view: {
				name: 'permit.expiration-edit',
				data: data
			},
			buttons: {
				accept: 'Save',
				decline: 'Cancel'
			},
			ui: {
				static: true
			}
		});

		dialog.on('keyup', '#expirationdays', function(e) {
			var i = dialog.find('.permit-issued');
			if(i.length) {
				var d = dialog.find('.permit-issued').data('issueddate');
				var e = dialog.find('.permit-expires');
				var days = dialog.find('#expirationdays').val();
				var parts = d.split('-');
				var issued = new Date(parts[0], parts[1]-1, parts[2]);
				var expires = new Date(issued.getTime() + (86400000 * days));;

				if(!days.length || days == 0) {
					e.text('Removes Expiration');
				} else if(isNaN(expires.getMonth())) {
					e.text('Invalid Number');
				} else {
					e.text(expires.getMonth()+1 + '/' + expires.getDate() + '/' +  expires.getFullYear());
				}
			} else {

			}
		});

		dialog.on('click', '.btn-primary', function() {
			dialog.loading();
			self.controller.action('permit.expires', {
				issuanceid : dialog.find('#issuanceid').val(),
				expiration : dialog.find('#expirationdays').val()
			}, {
				method: 'POST'
			}).done(function(res) {
				if(res.SUCCESS) {
					dialog.hide();
					window.location.reload();
				} else {
					alert('Error saving expiration');
				}
			}).fail(function() {
				alert('Error saving expiration');
			}).always(function() {
				dialog.loading(false);
			});
		});
	},
/**********************************************************************************************************************/
	// dev-235 mm 11/24 - Complete rewrite of extend()
	extend: function(e, target, data) {
		const self = idtplans.permit;
		const dialog = idtplans.dialog;

		dialog.show({
			title: 'Extend Expiration Date',
			view: {
				name: 'permit.expiration-extend',
				data: data
			},
			buttons: {
				accept: 'Save',
				decline: 'Cancel'
			},
			ui: {
				static: true
			}
		});

		function checkDate() {
			const oExpireDate = dialog.find('#permitExpiresOnDTTM');
			const oDisplayInfo = dialog.find('#displayInfo');
			const oErrorInfo = dialog.find('#errorInfo');

			// Clear error text
			oErrorInfo.html('');

			// Check if empty date
			if (!oExpireDate.val().length) {
				oDisplayInfo.text('This permit will be set to never expire.');
				return true;
			}

			// Check for date format combinations of m/d/yy to mm/dd/yyyy since "new Date()" and Date.parse accepts odd things
			const reDateMatch = new RegExp(/^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(\d{2})?\d{2}$/);
			if (!reDateMatch.test(oExpireDate.val())) {
				oDisplayInfo.text('The expiration date is invalid.');
				return false;
			}
			
			// Fix wrongly accepted dates like 2/30/[year] and 9/31/[year]; this will adjust the date to a real date
			const correctedDate = new Date(oExpireDate.val());
			oExpireDate.val((correctedDate.getMonth() + 1) + '/' + correctedDate.getDate() + '/' + correctedDate.getFullYear());
			
			// Get the current date without time
			const currentDate = new Date(new Date().toDateString());
			// Get the current date timestamp
			const tsCurrentDate = Date.parse(currentDate);
			// Get the expire date timestamp
			const tsExpireDate = Date.parse(oExpireDate.val());
			
			// Check that date is not in the past
			if (tsExpireDate < tsCurrentDate) {
				oDisplayInfo.text('The expiration date cannot be in the past.');
				return false;
			}

			// Check that date is not more than ten years in the future
			const tsTenYearsFromNowDate = Date.parse(
				new Date(
					(currentDate.getMonth() + 1)
					+ '/' + currentDate.getDate()
					+ '/' + (currentDate.getFullYear() + 10)
				)
			);
			if (tsExpireDate > tsTenYearsFromNowDate) {
				oDisplayInfo.text('The expiration date is too far in the future.');
				return false;
			}

			// Get the expire time in days (rounding is needed due to possible DST crossing)
			const expireTimeInDays = Math.round((tsExpireDate - tsCurrentDate) / 1000 / 60 / 60 / 24);
			// Display information to the user (review related text in server code expiration-extend)
			if (expireTimeInDays === 0) {
				oDisplayInfo.text('This permit will be set to expire today.');
			} else if (expireTimeInDays === 1) {
				oDisplayInfo.text('This permit will be set to expire in 1 day.');
			} else {
				oDisplayInfo.text('This permit will be set to expire in ' + expireTimeInDays + ' days.');
			}
			return true;
		};

		dialog.on('change', '#permitExpiresOnDTTM', function(e) {
			checkDate();
		});

		dialog.on('click', '[id^=addDays]', function(e) {
			const oExpireDate = dialog.find('#permitExpiresOnDTTM');
			const daysToAdd =  $(this).data('count');

			// Defaults an invalid date to current date
			let setNewDate = oExpireDate.datepicker('getDate');
			// Defaults an empty date to the current date
			if (setNewDate === null) {
				setNewDate = new Date();
			}

			// Add the days (overridees a computed past date to the current date)
			setNewDate.setDate(setNewDate.getDate() + daysToAdd); 
			oExpireDate.datepicker('setDate', setNewDate);

			checkDate();
		});

		dialog.on('click', '.btn-primary', function() {
			const oIssuanceID = dialog.find('#issuanceID'); 
			const oExpireDate = dialog.find('#permitExpiresOnDTTM');
			const oErrorInfo = dialog.find('#errorInfo');

			let expireDate = oExpireDate.datepicker('getDate');
			// Convert to basic string date if not empty
			if (expireDate !== null) {
				expireDate = expireDate.toLocaleDateString("en-US");
			}
			if (checkDate()) {
				dialog.loading();
				self.controller.action('permit.updateExpirationDate', {
					issuanceID          : oIssuanceID.val(),
					permitExpiresOnDTTM : expireDate
				}, {
					method: 'POST'
				}).done(function(res) {
					if(res.SUCCESS) {
						dialog.hide();
						if(idtplans.layout) {
							idtplans.layout.reload();
						} else {
							window.location.reload();
						}
					} else {
						// Check that a valid response was returned
						if (typeof res.MESSAGE !== 'undefined') {
							oErrorInfo.html(res.MESSAGE);
						} else {
							oErrorInfo.html('Error saving expiration date.');
						}
					}
				}).fail(function() {
					oErrorInfo.html('Connection failure saving expiration date.');
				}).always(function() {
					dialog.loading(false);
				});
			} else {
				oErrorInfo.html('The date is invalid.');
			}
		});
	},
/**********************************************************************************************************************/
	remove : function(e, target, data) {
		target.closest('tr').remove();
	},

	forms: function(e, target, data) {
		var self = idtplans.permit;
		var expire = target.find('.fa-minus-circle').length ? true : false;
		var tbody = target.closest('.panel').find('#permit-type-forms');
		var list = target.closest('form').find('input[name=forms]');
		var val = list.val();

		if(expire) {
			// delete selection
			list.val(idtplans.util.listRemove(val, data.formid));
			var td = target.closest('tr').find('td').first();
			var txt = td.text();
			td.addClass('red');
			td.html('<s>' + txt + '</s> (unsaved)');
			target.hide();
		} else {
			var dialog = idtplans.dialog;
			var params = {
				permittypeid : data.ptid,
				selected     : val
			};

			dialog.show({
				title: 'Add form',
				view: {
					name : 'permittype.form-select',
					data : params
				},
				ui: {
					static: true
				},
				buttons: {
					accept  : 'Save',
					decline : 'Cancel'
				}
			});

			// save and display selection
			dialog.on('click', '.btn-primary', function() {
				var field = dialog.find('select[name=formid]');
				var selected = field.find(':selected');
				var formid = field.val();
				// validate selection
				if(!formid) {
					field.closest('.form-group').addClass('has-error');
				} else {
					var text = selected.text();
					var row = '<tr><td class="red">' + text + ' (unsaved)</td>'
							+ '<td class="text-right"><a href="##" class="permit-action" data-fn="forms" data-formid="' + formid + '">'
							+ '<i class="fas fa-minus-circle icon-delete permit-action" data-fn="remove"></i></a></td></tr>';
					tbody.find('.no-records').remove();
					val = idtplans.util.listAdd(val, formid);
					list.val(val);
					tbody.append(row);
					dialog.hide();
				}
			});
		}
	},

	fee: function(e, target, data) {
		var self = idtplans.permit;

		if(data.expire) {
			if(confirm('Are you sure you wish to remove this fee?')) {
				self.controller.action('fee', data, {
					method: 'POST'
				}).done(function(res) {
					if(res.SUCCESS) {
						target.closest('tr').remove();
					} else {
						var msg = res.MESSAGE || 'ERROR Removing Fee';
						alert(msg);
					}
				}).fail(function() {
					alert('ERROR Removing Fee');
				});
			}
		} else {
			var qs = idtplans.url.toquery({
				step          : 'projdata',
				commentLetter : 0,
				pid           : data.projectid,
				issuanceid    : data.issuanceid
			});
			launchPopUp('/secure/portal/fees/' + qs,'800','1100');
		}
	},

	feetypes: function(e, target, data) {
		var self = idtplans.permit;
		var tbody = target.closest('.panel').find('#permit-type-fees');
		var values = target.closest('form').find('input[name=fees]');

		var dialog = idtplans.dialog;
		var pbody;
		var params = {
				permittypeid : data.ptid,
				selected     : values.val()
			};

		dialog.show({
			size  : 'modal-lg',
			title : 'Permit Fee Types',
			view: {
				name : 'permittype.feetype-selection',
				data : params
			},
			ui: {
				static : true,
				height : '600px'
			},
			buttons: {
				accept  : 'Confirm',
				decline : 'Cancel'
			}
		});

		dialog.on('contentready', function() {
			pbody = dialog.find('.modal-body');
			idtplans.selections.init(pbody);
			setTimeout(function() {
				dialog.find('.formTableFilter input').focus();
			},500);
		});

		// save and display selections
		dialog.on('click', '.btn-primary', function() {
			var rows = idtplans.selections.checkedspec(pbody).clone();
			var title = target.closest('.panel').find('.panel-title');
			var thisFeeTypeDef = rows.find('.fee-type-default');
			rows.find('.no-copy').remove();
			thisFeeTypeDef.css("display","block");
			values.val(idtplans.selections.valuesspec(pbody));
			tbody.html(rows);
			if(!title.find('.panel-changed').length) {
				title.append('&nbsp;<span class="panel-changed">UNSAVED</span>');
			}
			dialog.hide();
		});
	},

	workflows: function(e, target, data) {
		var self = idtplans.permit;
		var expire = data.expire ? true : false;
		var tbody = target.closest('.panel').find('#permit-type-workflows');
		var values = target.closest('form').find('input[name=workflows]');
		var dialog = idtplans.dialog;
		var pbody;
		var params = {
				permittypeid : data.ptid,
				selected     : values.val()
			};

		dialog.show({
			size  : 'modal-lg',
			title : 'Permit Workflows',
			view: {
				name : 'permittype.workflow-selection',
				data : params
			},
			ui: {
				static : true,
				height : '600px'
			},
			buttons: {
				accept  : 'Confirm',
				decline : 'Cancel'
			}
		});

		dialog.on('contentready', function() {
			pbody = dialog.find('.modal-body');
			idtplans.selections.init(pbody);
			setTimeout(function() {
				dialog.find('.formTableFilter input').focus();
			},500);
		});

		// save and display selections
		dialog.on('click', '.btn-primary', function() {
			var rows = idtplans.selections.checked(pbody).clone();
			var title = target.closest('.panel').find('.panel-title');
			rows.find('.no-copy').remove();
			values.val(idtplans.selections.values(pbody));
			tbody.html(rows);
			if(!title.find('.panel-changed').length) {
				title.append('&nbsp;<span class="panel-changed">UNSAVED</span>');
			}
			dialog.hide();
		});
	},

	inspection: function(e, target, data) {
		var self = idtplans.permit;

		if(data.expire) {
			if(confirm('Are you sure you wish to remove this inspection?')) {
				self.controller.action('project.inspectiontype', data, {
					method: 'POST'
				}).done(function(res) {
					if(res.SUCCESS) {
						target.closest('tr').remove();
					} else {
						var msg = res.MESSAGE || 'ERROR Removing Inspection';
						alert(msg);
					}
				}).fail(function() {
					alert('ERROR Removing Inspection');
				});
			}
		} else {
			// show type selection form
			alert('TODO')
		}
	},

	inspections: function(e, target, data) {
		var self = idtplans.permit;
		var expire = target.find('.fa-minus-circle').length ? true : false;
		var tbody = target.closest('.panel').find('#permit-type-inspections');
		var list = target.closest('form').find('input[name=inspections]');
		var val = list.val();

		if(expire) {
			// delete selection
			list.val(idtplans.util.listRemove(val, data.inspectiontypeid));
			var td = target.closest('tr').find('td').first();
			var txt = td.text();
			td.addClass('red');
			td.html('<s>' + txt + '</s> (unsaved)');
			target.hide();
		} else {
			var dialog = idtplans.dialog;
			var params = {
					issuanceid   : data.issuanceid || 0,
					permittypeid : data.ptid || 0,
					selected     : val || ''
				};

			dialog.show({
				title: 'Add Inspection Type',
				view: {
					name : 'permittype.inspection-select',
					data : params
				},
				ui: {
					static: true
				},
				buttons: {
					accept  : 'Save',
					decline : 'Cancel'
				}
			});

			// save and display selection
			dialog.on('click', '.btn-primary', function() {
				var field = dialog.find('select[name=inspectiontypeid]');
				var selected = field.find(':selected');
				var inspectiontypeid = field.val();
				// validate selection
				if(!inspectiontypeid) {
					// no selection - show error
					field.closest('.form-group').addClass('has-error');
				} else if(data.issuanceid) {
					// TODO: save immediately
					self.controller.action('project.inspectiontype', {
						issuanceid       : data.issuanceid,
						inspectiontypeid : inspectiontypeid
					}, {
						method : 'POST'
					}).done(function(res) {
						if(res.SUCCESS) {
							$(document).find('#permit-inspections-tab').click();
							dialog.hide();
						} else {
							alert('Error adding inspection type');
						}
					});
				} else {
					// add selection to list
					var text = selected.text();
					var row = '<tr><td class="red">' + text + ' (unsaved)</td>'
							+ '<td class="text-right"><a href="##" class="permit-action" data-fn="inspections" data-inspectiontypeid="' + inspectiontypeid + '">'
							+ '<i class="fas fa-minus-circle icon-delete permit-action" data-fn="remove"></i></a></td></tr>';
					tbody.find('.no-records').remove();
					val = idtplans.util.listAdd(val, inspectiontypeid);
					list.val(val);
					tbody.append(row);
					dialog.hide();
				}
			});
		}
	},

	inspectiontypes: function(e, target, data) {
		var self = idtplans.permit;
		var tbody = target.closest('.panel').find('#permit-type-inspections');
		var values = target.closest('form').find('input[name=inspections]');
		var dialog = idtplans.dialog;
		var pbody;
		var params = {
				permittypeid : data.ptid || 0,
				selected     : values.val()
			};

		dialog.show({
			size  : 'modal-lg',
			title : 'Permit Inspection Types',
			view: {
				name : 'permittype.inspectiontype-selection',
				data : params
			},
			ui: {
				static : true,
				height : '600px'
			},
			buttons: {
				accept  : 'Confirm',
				decline : 'Cancel'
			}
		});

		dialog.on('contentready', function() {
			pbody = dialog.find('.modal-body');
			idtplans.selections.init(pbody);
			setTimeout(function() {
				dialog.find('.formTableFilter input').focus();
			},500);
		});

		// save and display selections
		dialog.on('click', '.btn-primary', function() {
			var rows = idtplans.selections.checked(pbody).clone();
			var title = target.closest('.panel').find('.panel-title');
			rows.find('.no-copy').remove();
			values.val(idtplans.selections.values(pbody));
			tbody.html(rows);
			if(!title.find('.panel-changed').length) {
				title.append('&nbsp;<span class="panel-changed">UNSAVED</span>');
			}
			dialog.hide();
		});
	},

	reason: function(e, target, data) {
		var self = idtplans.permit;
		var dialog = idtplans.dialog;
		var type = data.type;

		dialog.show({
			title: type + ' Permit',
			view: {
				name : 'permit.reason',
				data : data
			},
			ui: {
				static: true
			},
			buttons: {
				accept  : type,
				decline : 'Cancel'
			},
			focus : 'textarea'
		});

		dialog.on('click', '.btn-primary', function(e) {
			var selections = dialog.find('#permit-selections');
			var reason = dialog.find('#permit-reason');
			var statusid = dialog.find('#statusid');
			var _emailSubjectOverride = dialog.find('#permit-subject-override');
			var _emailBodyOverride = dialog.find('#permit-body-override');
			var _valEvent = dialog.find('#valEvent');
			var params = dialog.find('form').serializeArray();

			dialog.find('.has-error').removeClass('has-error');

			if(selections.length && !selections.find(':checked').length) {
				selections.addClass('has-error');
				return false;
			}

			if(_valEvent.val() == 'a'){
				if(_emailSubjectOverride.val() == "") {
					_emailSubjectOverride.closest('.form-group').addClass('has-error');
					return false;
				}
				if(_emailBodyOverride.val() == "") {
					_emailBodyOverride.closest('.form-group').addClass('has-error');
					return false;
				}
			}else{
				if(!reason.val().length) {
					reason.closest('.form-group').addClass('has-error');
					return false;
				}
			}

			dialog.loading();

			self.controller.action(type.toLowerCase(), params, {
				method: 'POST'
			}).done(function(res) {
				if(res.SUCCESS) {
					dialog.hide();
					if(idtplans.layout) {
						//idtplans.project.prompt();
						idtplans.layout.reload();
					} else {
						self.load();
						idtplans.note.load();
						idtplans.project.messages();
					}
				} else {
					alert('Error saving permit status change');
				}
			}).fail(function() {
				alert('Error saving permit status change');
			}).always(function() {
				dialog.loading(false);
			});
		});
	},

	document: function(e, target, data) {
		var self = idtplans.permit;
		var dialog = idtplans.dialog;

		dialog.show({
			title: 'Permit Document',
			view: {
				name : 'permit.document-select',
				data : data
			},
			ui: {
				static: true
			},
			buttons: {
				accept  : 'Save',
				decline : 'Cancel'
			}
		});

		dialog.on('dialogcontentready', function() {
			dialog.find('#documentid').css('max-width', 300);
		});

		dialog.on('click', '.btn-primary', function() {
			data.documents = dialog.find('#documentid').val();
			self.controller.action('document', data, {
				method: 'POST'
			}).done(function(res) {
				if(res.SUCCESS) {
					dialog.hide();
					window.location.reload();
				} else {
					alert('Error saving document');
				}
			}).fail(function() {
				alert('Error saving document');
			});
		});
	},

	contact: function(e) {
		var self = idtplans.permit;
		var target = $(e.target).closest('.permit-contact');
		var data = target.data();
		var params = idtplans.url.params();
		var selected = target.find('option:selected');
		var fields = {
			issuanceid  : params.issuanceid,
			id          : target.val(),
			type        : data.type,
			contacttype : selected.data('type')
		};

		target.closest('.form-group').removeClass('has-error');
		if(!target.val()) {
			target.closest('.form-group').addClass('has-error');
			return;
		}

		self.controller.action('contact', fields, {
			method: 'POST'
		}).done(function(res) {
			if(res.SUCCESS) {
				idtplans.tooltip.show(target, {
					content: 'Save Successful',
					timeout: 3000
				});
			} else {
				alert('Error saving contact');
			}
		}).fail(function() {
			alert('Error saving contact');
		});
	},

	description: function(e) {
		var self = idtplans.permit;
		var target = $(e.target).closest('.permit-description');
		var data = target.data();
		var params = idtplans.url.params();
		var fields = {
			issuanceid  : params.issuanceid,
			permitdescription: target.val()
		};

		target.closest('.form-group').removeClass('has-error');
		if(!target.val()) {
			target.closest('.form-group').addClass('has-error');
			return;
		}

		self.controller.action('description', fields, {
			method: 'POST'
		}).done(function(res) {
			if(res.SUCCESS) {
				idtplans.tooltip.show(target, {
					content: 'Save Successful',
					timeout: 3000
				});
			} else {
				alert('Error saving description');
			}
		}).fail(function() {
			alert('Error saving description');
		});
	},

	formatDateRange: function() {
		var dateOperator = $('#permit-date-range-operator').val();

		$('#permit-date-range-duration').hide();
		$('#permit-date-range-start').hide();
		$('#permit-date-range-end').hide();
		$('#permit-date-range-duration-operator').hide();

		switch(dateOperator) {
			case 'on':
				$('#permit-date-range-start').show();
				break;
			case 'before':
				$('#permit-date-range-start').show();
				break;
			case 'between':
				$('#permit-date-range-start').show();
				$('#permit-date-range-end').show();
				break;
			case 'after':
				$('#permit-date-range-start').show();
				break;
			case 'greater':
				$('#permit-date-range-duration').show();
				$('#permit-date-range-duration-operator').show();
				break;
			case 'less':
				$('#permit-date-range-duration').show();
				$('#permit-date-range-duration-operator').show();
				break;
			default:
				break;
		}
	},

	searchInit : function() {
		var self = idtplans.permit;

		$('#permit-date-range-start').datepicker({numberOfMonths: 1});
		$('#permit-date-range-end').datepicker({numberOfMonths: 1});

		self.formatDateRange();
	},

	copy : function(e, target, data) {
		var self = idtplans.permit;
		var dialog = idtplans.dialog;

		dialog.show({
			title: 'Copy Permit Type',
			view: {
				name : 'permittype.copy-options',
				data : data
			},
			ui: {
				static: true
			},
			buttons: {
				accept  : 'Save',
				decline : 'Cancel'
			}
		});

		// load popovers
		dialog.on('dialogcontentready', function() {
			dialog.find('.popover-hover').popover({trigger: 'hover click', placement: 'auto', container: 'body'});
		});

		dialog.on('change', '#targetid', function() {
			var targetid = dialog.find('#targetid');
			var props = dialog.find('#properties');
			if(targetid.val() === '0') {
				props.prop({
					'checked'  : true,
					'disabled' : true
				});
			} else {
				props.prop('disabled', false);
			}
		});

		dialog.on('click', '.btn-primary', function() {
			var form = dialog.find('form');
			var fields = form.serializeArray();
			var sourceid = dialog.find('#sourceid');
			var targetid = dialog.find('#targetid');

			dialog.find('.has-error').removeClass('has-error');
			if(!sourceid.val()) {
				sourceid.closest('.form-group').addClass('has-error');
			}
			if(!targetid.val().length) {
				targetid.closest('.form-group').addClass('has-error');
			} else if(targetid.val() === '0') {
				fields.push({
					name  : 'properties',
					value : '1'
				});
			}

			if(dialog.find('.has-error').length) {
				return false;
			}

			dialog.loading();
			self.controller.action('permittype.copy', fields, {
				method: 'POST'
			}).done(function(res) {
				if(res.SUCCESS && res.DATA.PERMITTYPEID) {
					dialog.hide();
					window.location.href = '/secure/permits/?step=type&ptid=' + res.DATA.PERMITTYPEID;
				} else {
					alert('Error copying permit type');
				}
			}).fail(function() {
				alert('Error copying permit type');
			}).always(function() {
				dialog.loading(false);
			});
		});
	}

}

$(function() {
	idtplans.permit.init();
});
