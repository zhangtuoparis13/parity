// Copyright 2015-2017 Parity Technologies (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

import { action, computed, observable, transaction } from 'mobx';

// TODO: We need to move this to a generic location, it should most probably be
// merged with the other valitation errors. Import here better than duplication.
import ERRORS from '~/modals/CreateAccount/errors';

let instance;

export default class Store {
  @observable isBusyAccounts = false;
  @observable isBusyCreate = false;
  @observable isBusyLoad = false;
  @observable isBusyLock = false;
  @observable isBusyUnlock = false;
  @observable isModalAccountsOpen = false;
  @observable isModalCreateOpen = false;
  @observable isModalLockOpen = false;
  @observable isModalUnlockOpen = false;
  @observable selectedAccounts = {};
  @observable vault = null;
  @observable vaults = [];
  @observable vaultNames = [];
  @observable vaultName = '';
  @observable vaultNameError = ERRORS.noName;
  @observable vaultDescription = '';
  @observable vaultPassword = '';
  @observable vaultPasswordHint = '';
  @observable vaultPasswordRepeat = '';

  constructor (api) {
    this._api = api;
  }

  @computed get vaultPasswordRepeatError () {
    return this.vaultPassword === this.vaultPasswordRepeat
      ? null
      : ERRORS.noMatchPassword;
  }

  @action clearVaultFields = () => {
    transaction(() => {
      this.vault = null;
      this.vaultDescription = '';
      this.vaultName = '';
      this.vaultNameError = ERRORS.noName;
      this.vaultPassword = '';
      this.vaultPasswordHint = '';
      this.vaultPasswordRepeat = '';
    });
  }

  @action setBusyAccounts = (isBusy) => {
    this.isBusyAccounts = isBusy;
  }

  @action setBusyCreate = (isBusy) => {
    this.isBusyCreate = isBusy;
  }

  @action setBusyLoad = (isBusy) => {
    this.isBusyLoad = isBusy;
  }

  @action setBusyLock = (isBusy) => {
    this.isBusyLock = isBusy;
  }

  @action setBusyUnlock = (isBusy) => {
    this.isBusyUnlock = isBusy;
  }

  @action setModalAccountsOpen = (isOpen) => {
    this.isModalAccountsOpen = isOpen;
  }

  @action setModalCreateOpen = (isOpen) => {
    this.isModalCreateOpen = isOpen;
  }

  @action setModalLockOpen = (isOpen) => {
    this.isModalLockOpen = isOpen;
  }

  @action setModalUnlockOpen = (isOpen) => {
    transaction(() => {
      this.setVaultPassword('');
      this.isModalUnlockOpen = isOpen;
    });
  }

  @action setSelectedAccounts = (selectedAccounts) => {
    this.selectedAccounts = selectedAccounts;
  }

  @action setVaults = (allVaults, openedVaults, metaData) => {
    transaction(() => {
      this.vaultNames = allVaults.map((name) => name.toLowerCase());
      this.vaults = allVaults.map((name, index) => {
        return {
          meta: metaData[index] || {},
          name,
          isOpen: openedVaults.includes(name)
        };
      });
    });
  }

  @action setVaultDescription = (description) => {
    this.vaultDescription = description;
  }

  @action setVaultName = (name) => {
    let nameError = null;

    if (!name || !name.trim().length) {
      nameError = ERRORS.noName;
    } else {
      const lowerName = name.toLowerCase();

      if (this.vaultNames.includes(lowerName)) {
        nameError = ERRORS.duplicateName;
      }
    }

    transaction(() => {
      this.vault = this.vaults.find((vault) => vault.name === name);
      this.vaultName = name;
      this.vaultNameError = nameError;
    });
  }

  @action setVaultPassword = (password) => {
    this.vaultPassword = password;
  }

  @action setVaultPasswordHint = (hint) => {
    this.vaultPasswordHint = hint;
  }

  @action setVaultPasswordRepeat = (password) => {
    this.vaultPasswordRepeat = password;
  }

  @action toggleSelectedAccount = (address) => {
    this.setSelectedAccounts(Object.assign({}, this.selectedAccounts, {
      [address]: !this.selectedAccounts[address] })
    );
  }

  closeAccountsModal () {
    this.setModalAccountsOpen(false);
  }

  closeCreateModal () {
    this.setModalCreateOpen(false);
  }

  closeLockModal () {
    this.setModalLockOpen(false);
  }

  closeUnlockModal () {
    this.setModalUnlockOpen(false);
  }

  openAccountsModal (name) {
    transaction(() => {
      this.setVaultName(name);
      this.setSelectedAccounts({});
      this.setModalAccountsOpen(true);
    });
  }

  openCreateModal () {
    transaction(() => {
      this.clearVaultFields();
      this.setModalCreateOpen(true);
    });
  }

  openLockModal (name) {
    transaction(() => {
      this.setVaultName(name);
      this.setModalLockOpen(true);
    });
  }

  openUnlockModal (name) {
    transaction(() => {
      this.setVaultName(name);
      this.setModalUnlockOpen(true);
    });
  }

  loadVaults = () => {
    this.setBusyLoad(true);

    return Promise
      .all([
        this._api.parity.listVaults(),
        this._api.parity.listOpenedVaults()
      ])
      .then(([allVaults, openedVaults]) => {
        return Promise
          .all(allVaults.map((name) => {
            return this._api.parity
              .getVaultMeta(name)
              .catch(() => {
                // NOTE: getVaultMeta throws when no metadata has been creted yet
                return {};
              });
          }))
          .then((metaData) => {
            this.setBusyLoad(false);
            this.setVaults(allVaults, openedVaults, metaData);
          });
      })
      .catch((error) => {
        console.warn('loadVaults', error);
        this.setBusyLoad(false);
      });
  }

  closeVault () {
    this.setBusyLock(true);

    return this._api.parity
      .closeVault(this.vaultName)
      .then(this.loadVaults)
      .then(() => {
        this.setBusyLock(false);
      })
      .catch((error) => {
        console.error('closeVault', error);
        this.setBusyLock(false);
        throw error;
      });
  }

  createVault () {
    if (this.vaultNameError || this.vaultPasswordRepeatError) {
      return Promise.reject();
    }

    this.setBusyCreate(true);

    return this._api.parity
      .newVault(this.vaultName, this.vaultPassword)
      .then(() => {
        return this._api.parity.setVaultMeta(this.vaultName, {
          description: this.vaultDescription,
          passwordHint: this.vaultPasswordHint
        });
      })
      .then(this.loadVaults)
      .then(() => {
        this.setBusyCreate(false);
      })
      .catch((error) => {
        console.error('createVault', error);
        this.setBusyCreate(false);
        throw error;
      });
  }

  openVault () {
    this.setBusyUnlock(true);

    return this._api.parity
      .openVault(this.vaultName, this.vaultPassword)
      .then(this.loadVaults)
      .then(() => {
        this.setBusyUnlock(false);
      })
      .catch((error) => {
        console.error('openVault', error);
        this.setBusyUnlock(false);
        throw error;
      });
  }

  moveAccounts (vaultName, inAccounts, outAccounts) {
    this.setBusyAccounts(true);

    return Promise
      .all([
        inAccounts.map((address) => this._api.parity.changeVault(address, vaultName)),
        outAccounts.map((address) => this._api.parity.changeVault(address, ''))
      ])
      .then(this.loadVaults)
      .then(() => {
        this.setBusyAccounts(false);
      })
      .catch((error) => {
        console.error('moveAccounts', error);
        this.setBusyAccounts(false);
        throw error;
      });
  }

  static get (api) {
    if (!instance) {
      instance = new Store(api);
    }

    return instance;
  }
}
