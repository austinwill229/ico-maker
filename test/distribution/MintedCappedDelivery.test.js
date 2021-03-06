const { BN, constants, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { shouldBehaveLikeCappedDelivery } = require('./CappedDelivery.behaviour');

const CappedDelivery = artifacts.require('MintedCappedDelivery');
const BaseToken = artifacts.require('BaseERC20Token');

contract('MintedCappedDelivery', function (accounts) {
  const [
    tokenOwner,
    cappedDeliveryOwner,
    receiver,
  ] = accounts;

  const name = 'BaseToken';
  const symbol = 'ERC20';
  const decimals = new BN(18);
  const tokenCap = new BN(100000);
  const initialSupply = new BN(0);

  beforeEach(async function () {
    this.token = await BaseToken.new(name, symbol, decimals, tokenCap, initialSupply, { from: tokenOwner });
  });

  const testingDelivery = function (allowMultipleSend) {
    context('creating a valid delivery', function () {
      describe('if token address is the zero address', function () {
        it('reverts', async function () {
          await expectRevert.unspecified(
            CappedDelivery.new(ZERO_ADDRESS, tokenCap, allowMultipleSend, { from: cappedDeliveryOwner }),
          );
        });
      });

      describe('if cap is zero', function () {
        it('reverts', async function () {
          await expectRevert.unspecified(
            CappedDelivery.new(this.token.address, 0, allowMultipleSend, { from: cappedDeliveryOwner }),
          );
        });
      });

      context('testing behaviours', function () {
        beforeEach(async function () {
          this.cappedDelivery = await CappedDelivery.new(
            this.token.address,
            tokenCap,
            allowMultipleSend,
            { from: cappedDeliveryOwner },
          );

          await this.token.addMinter(this.cappedDelivery.address, { from: tokenOwner });
        });

        describe('sending tokens if minting is finished', function () {
          it('reverts', async function () {
            await this.token.finishMinting({ from: tokenOwner });
            await expectRevert.unspecified(
              this.cappedDelivery.multiSend([receiver], [100], { from: cappedDeliveryOwner }),
            );
          });
        });

        context('like a CappedDelivery', function () {
          shouldBehaveLikeCappedDelivery(accounts, tokenCap, allowMultipleSend);
        });
      });
    });
  };

  context('if allowing multiple send', function () {
    const allowMultipleSend = true;
    testingDelivery(allowMultipleSend);
  });

  context('if not allowing multiple send', function () {
    const allowMultipleSend = false;
    testingDelivery(allowMultipleSend);
  });
});
