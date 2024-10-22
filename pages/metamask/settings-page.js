const settingsPage = '.settings-page';
const advancedButton = `${settingsPage} button:nth-child(2)`;
const networksButton = `${settingsPage} button:nth-child(6)`;
const closeButton = `${settingsPage} .settings-page__header__title-container__close-button`;
module.exports.settingsPageElements = {
  settingsPage,
  advancedButton,
  networksButton,
  closeButton,
};

const resetAccountButton =
  '[data-testid="advanced-setting-reset-account"] button';
const showHexDataToggleOn =
  '[data-testid="advanced-setting-hex-data"] .toggle-button--on';
const showHexDataToggleOff =
  '[data-testid="advanced-setting-hex-data"] .toggle-button--off';
const showTestnetConversionOn =
  'div.settings-page__content__modules > div.settings-page__body > div:nth-child(5) .toggle-button--on';
const showTestnetConversionOff =
  'div.settings-page__content__modules > div.settings-page__body > div:nth-child(5) .toggle-button--off';
const showTestnetNetworksOn =
  'div.settings-page__content__modules > div.settings-page__body > div:nth-child(6) .toggle-button--on';
const showTestnetNetworksOff =
  'div.settings-page__content__modules > div.settings-page__body > div:nth-child(6) .toggle-button--off';
const customNonceToggleOn =
  '[data-testid="advanced-setting-custom-nonce"] .toggle-button--on';
const customNonceToggleOff =
  '[data-testid="advanced-setting-custom-nonce"] .toggle-button--off';
const dismissBackupReminderOn =
  '[data-testid="advanced-setting-dismiss-reminder"] .toggle-button--on';
const dismissBackupReminderOff =
  '[data-testid="advanced-setting-dismiss-reminder"] .toggle-button--off';
const ethSignRequestsToggleOn =
  '[data-testid="advanced-setting-toggle-ethsign"] .toggle-button--on';
const ethSignRequestsToggleOff =
  '[data-testid="advanced-setting-toggle-ethsign"] .toggle-button--off';
module.exports.advancedPageElements = {
  resetAccountButton,
  showHexDataToggleOn,
  showHexDataToggleOff,
  showTestnetConversionOn,
  showTestnetConversionOff,
  showTestnetNetworksOn,
  showTestnetNetworksOff,
  dismissBackupReminderOn,
  dismissBackupReminderOff,
  customNonceToggleOn,
  customNonceToggleOff,
  ethSignRequestsToggleOn,
  ethSignRequestsToggleOff,
};

const improvedTokenAllowanceToggleOn =
  '.settings-page__content-row:nth-child(1) .toggle-button--on';
const improvedTokenAllowanceToggleOff =
  '.settings-page__content-row:nth-child(1) .toggle-button--off';
module.exports.experimentalSettingsPageElements = {
  improvedTokenAllowanceToggleOn,
  improvedTokenAllowanceToggleOff,
};

const nevermindButton = '.modal-container .btn-secondary';
const resetButton = '.modal-container .btn-danger-primary';
module.exports.resetAccountModalElements = {
  nevermindButton,
  resetButton,
};

const addNetworkButton = '.networks-tab__body button';
module.exports.networksPageElements = { addNetworkButton };

// const addNetworkForm = '.networks-tab__add-network-form-body';
const addNetworkForm = '.multichain-network-list-menu-content-wrapper__dialog';

const networkNameInput = `${addNetworkForm} [data-testid="network-form-network-name"]`;

const addRpcUrlDropDown = `${addNetworkForm} [data-testid="test-add-rpc-drop-down"]`;
const addRpcUrlButton = `${addNetworkForm} .dropdown-editor__item button`;
const addRpcUrlInput = `[data-testid="rpc-url-input-test"]`;
const addRpcUrlConfirmButton = `.add-rpc-modal__footer button`;
// const rpcUrlInput = `${addNetworkForm} [data-testid="network-form-rpc-url"]`;
const chainIdInput = `${addNetworkForm} [data-testid="network-form-chain-id"]`;
const symbolInput = `${addNetworkForm} [data-testid="network-form-ticker-input"]`;

const addExplorerUrlDropDown = `${addNetworkForm} [data-testid="test-add-explorer-drop-down"]`;
const addExplorerUrlButton = `${addNetworkForm} .dropdown-editor__item button`;
const addExplorerUrlInput = `[data-testid="explorer-url-input"]`;
const addExplorerUrlConfirmButton = `.add-block-explorer-modal__footer button`;

// const blockExplorerInput = `${addNetworkForm} [data-testid="network-form-block-explorer-url"]`;
const saveButton = '.networks-tab__add-network-form-footer .btn-primary';
const switchButton = '.home__new-network-added__switch-to-button';
module.exports.addNetworkPageElements = {
  addNetworkForm,
  networkNameInput,
  addRpcUrlDropDown,
  addRpcUrlButton,
  addRpcUrlInput,
  addRpcUrlConfirmButton,
  // rpcUrlInput,
  chainIdInput,
  symbolInput,
  // blockExplorerInput,
  addExplorerUrlDropDown,
  addExplorerUrlButton,
  addExplorerUrlInput,
  addExplorerUrlConfirmButton,
  saveButton,
  switchButton,
};
