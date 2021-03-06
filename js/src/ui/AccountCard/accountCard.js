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

import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import keycode from 'keycode';

import Balance from '~/ui/Balance';
import IdentityIcon from '~/ui/IdentityIcon';
import IdentityName from '~/ui/IdentityName';
import Tags from '~/ui/Tags';

import styles from './accountCard.css';

export default class AccountCard extends Component {
  static propTypes = {
    account: PropTypes.object.isRequired,
    balance: PropTypes.object,
    className: PropTypes.string,
    onClick: PropTypes.func,
    onFocus: PropTypes.func
  };

  state = {
    copied: false
  };

  render () {
    const { account, balance, className } = this.props;
    const { copied } = this.state;
    const { address, description, meta = {}, name } = account;
    const { tags = [] } = meta;
    const classes = [ styles.account, className ];

    if (copied) {
      classes.push(styles.copied);
    }

    return (
      <div
        key={ address }
        tabIndex={ 0 }
        className={ classes.join(' ') }
        onClick={ this.onClick }
        onFocus={ this.onFocus }
        onKeyDown={ this.handleKeyDown }
      >
        <div className={ styles.mainContainer }>
          <div className={ styles.infoContainer }>
            <IdentityIcon address={ address } />
            <div className={ styles.accountInfo }>
              <div className={ styles.accountName }>
                <IdentityName
                  address={ address }
                  name={ name }
                  unknown
                />
              </div>
              { this.renderDescription(description) }
              { this.renderAddress(address) }
            </div>
          </div>

          <Balance
            balance={ balance }
            className={ styles.balance }
            showOnlyEth
            showZeroValues
          />
        </div>

        {
          tags && tags.length > 0
          ? (
            <div className={ styles.tagsContainer }>
              <div className={ styles.tags }>
                <Tags
                  floating={ false }
                  horizontal
                  tags={ tags }
                />
              </div>
            </div>
          ) : null
        }

      </div>
    );
  }

  renderDescription (description) {
    if (!description) {
      return null;
    }

    return (
      <div className={ styles.description }>
        <span>{ description }</span>
      </div>
    );
  }

  renderAddress (address) {
    return (
      <div className={ styles.addressContainer }>
        <span
          className={ styles.address }
          onClick={ this.preventEvent }
          ref={ `address` }
          title={ address }
        >
          { address }
        </span>
      </div>
    );
  }

  handleKeyDown = (event) => {
    const codeName = keycode(event);

    if (event.ctrlKey) {
      // Copy the selected address if nothing selected and there is
      // a focused item
      const isSelection = !window.getSelection || window.getSelection().type === 'Range';

      if (codeName === 'c' && !isSelection) {
        const element = ReactDOM.findDOMNode(this.refs.address);

        // Copy the address from the right element
        // @see https://developers.google.com/web/updates/2015/04/cut-and-copy-commands
        try {
          const range = document.createRange();

          range.selectNode(element);
          window.getSelection().addRange(range);
          document.execCommand('copy');

          try {
            window.getSelection().removeRange(range);
          } catch (e) {
            window.getSelection().removeAllRanges();
          }

          this.setState({ copied: true }, () => {
            window.setTimeout(() => {
              this.setState({ copied: false });
            }, 250);
          });
        } catch (e) {
          console.warn('could not copy');
        }
      }

      return event;
    }
  }

  onClick = () => {
    const { account, onClick } = this.props;

    onClick && onClick(account.address);
  }

  onFocus = () => {
    const { account, onFocus } = this.props;

    onFocus && onFocus(account.index);
  }

  preventEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  }

  setTagRef = (tagRef) => {
    this.tagRefs.push(tagRef);
  }
}
