const { assert } = require("chai");

const CBANK = artifacts.require("CBANK");
contract("CBANK", accounts => {
  const [owner, ordinary, burner, locker, locked, locked2, timeLocked1, investorLocked1, investorLocked2, investorLocked3] = accounts;
  const BigNumber = web3.BigNumber;

  const timeTravel = async function(seconds) {
    await evmIncreaseTime(seconds);
    await evmMine();
  };
  const evmIncreaseTime = function(seconds) {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [seconds], //86,400 is num seconds in day
          id: new Date().getTime()
        },
        (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        }
      );
    });
  };
  const evmMine = function() {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_mine",
          params: [],
          id: new Date().getTime()
        },
        (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        }
      );
    });
  };

  require("chai")
    .use(require("chai-as-promised"))
    .use(require("chai-bignumber")(BigNumber))
    .should();

  describe("1. owner  test", () => {
    it("1-1 should put 10,000,000,000 CBANK in the owner account", async () => {
      let cbank = await CBANK.deployed();
      let balance = await cbank.balanceOf(owner);
      assert.equal(balance.valueOf(), 10000000000000000000000000000, "10,000,000,000 wasn't in the owner account");
    });
    it("1-2 should hidden owner account is same as owner account", async () => {
      let cbank = await CBANK.deployed();
      let hiddenOwnerAddress = await cbank.hiddenOwner();
      assert.equal(hiddenOwnerAddress, owner, "owner is not hidden owner");
    });
  });
  describe("2. transfer test", () => {
    it("2-1 should transfer some token to ordinary", async () => {
      let cbank = await CBANK.deployed();
      let amount = 1000000;
      await cbank.transfer(ordinary, amount, { from: owner });
      let balance = await cbank.balanceOf(ordinary);
      assert.equal(amount, balance.valueOf(), "transfer failed");
    });
  });
  describe("3. burner test", () => {
    it("3-1 should set burner properly by owner", async () => {
      let cbank = await CBANK.deployed();
      let isBurner = false;

      isBurner = await cbank.isBurner(burner);
      assert.isFalse(isBurner, "burner should not be added");

      try {
        await cbank.addBurner(burner, { from: ordinary });
      } catch (e) {}
      isBurner = await cbank.isBurner(burner);
      assert.isFalse(isBurner, "burner should not be added");

      await cbank.addBurner(burner, { from: owner });
      isBurner = await cbank.isBurner(burner);
      assert.isTrue(isBurner, "burner should be added");

      try {
        await cbank.removeBurner(burner, { from: ordinary });
      } catch (e) {}
      isBurner = await cbank.isBurner(burner);
      assert.isTrue(isBurner, "burner should not be removed");

      isBurner = await cbank.removeBurner(burner, { from: owner });
      isBurner = await cbank.isBurner(burner);
      assert.isFalse(isBurner, "burner should be removed");
    });
    it("3-2 should burn", async () => {
      let cbank = await CBANK.deployed();
      let transferredAmount = 2000000;
      let burnedAmount = 1000000;
      let balance = 0;
      let isBurner = false;

      await cbank.addBurner(burner, { from: owner });
      isBurner = await cbank.isBurner(burner);
      assert.isTrue(isBurner, "burner should be added");

      await cbank.transfer(burner, transferredAmount, { from: owner });
      balance = await cbank.balanceOf(burner);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");

      await cbank.burn(burnedAmount, { from: burner });
      balance = await cbank.balanceOf(burner);
      assert.equal(transferredAmount - burnedAmount, balance.valueOf(), "burned failed");

      isBurner = await cbank.removeBurner(burner, { from: owner });
      isBurner = await cbank.isBurner(burner);
      assert.isFalse(isBurner, "burner should be removed");
    });
  });
  describe("4. locker test", () => {
    it("4-1 should lock and unlock properly by owner", async () => {
      let cbank = await CBANK.deployed();
      let isLocker = false;
      isLocker = await cbank.isLocker(locker);
      assert.isFalse(isLocker, "locker should not be added");
      try {
        await cbank.addLocker(locker, { from: ordinary });
      } catch (e) {}
      isLocker = await cbank.isLocker(locker);
      assert.isFalse(isLocker, "locker should not be added");
      await cbank.addLocker(locker, { from: owner });
      isLocker = await cbank.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      try {
        await cbank.removeLocker(locker, { from: ordinary });
      } catch (e) {}
      isLocker = await cbank.isLocker(locker);
      assert.isTrue(isLocker, "locker should not be removed");
      isLocker = await cbank.removeLocker(locker, { from: owner });
      isLocker = await cbank.isLocker(locker);
      assert.isFalse(isLocker, "locker should be removed");
    });
    it("4-2 should lock and transfer", async () => {
      let cbank = await CBANK.deployed();
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      await cbank.addLocker(locker, { from: owner });
      isLocker = await cbank.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await cbank.transfer(locked, lockedAmount, { from: owner });
      balance = await cbank.balanceOf(locked);
      assert.equal(lockedAmount, balance.valueOf(), "transfer failed");
      await cbank.lock(locked, { from: locker });
      try {
        await cbank.transfer(owner, lockedAmount, { from: locked });
      } catch (e) {}
      balance = await cbank.balanceOf(locked);
      assert.equal(lockedAmount, balance.valueOf(), "transferred");
      await cbank.unlock(locked, { from: owner });
      await cbank.transfer(owner, lockedAmount, { from: locked });
      balance = await cbank.balanceOf(locked);
      assert.equal(0, balance.valueOf(), "transferred");
    });
    it("4-3 should time lock add and remove work right", async () => {
      let cbank = await CBANK.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      let now = Date.now();
      let timeLockLength = 0;
      let timeLockedAmount = 0;
      let timeLockInfo = [];
      await cbank.addLocker(locker, { from: owner });
      isLocker = await cbank.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await cbank.transfer(locked, transferredAmount, { from: owner });
      balance = await cbank.balanceOf(locked);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await cbank.addTimeLock(locked, lockedAmount, now + 300, { from: locker });
      timeLockLength = await cbank.getTimeLockLength(locked);
      assert.equal(timeLockLength, 1, "time locked: 1 time");
      timeLockedAmount = await cbank.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount, "time locked amount is different");
      await cbank.addTimeLock(locked, lockedAmount + 100, now + 400, {
        from: locker
      });
      timeLockLength = await cbank.getTimeLockLength(locked);
      assert.equal(timeLockLength, 2, "time locked: 2 time");
      timeLockedAmount = await cbank.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount * 2 + 100, "time locked amount is different");
      await cbank.addTimeLock(locked, lockedAmount + 200, now + 500, {
        from: locker
      });
      timeLockLength = await cbank.getTimeLockLength(locked);
      assert.equal(timeLockLength, 3, "time locked: 3 time");
      timeLockedAmount = await cbank.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount * 3 + 300, "time locked amount is different");
      await cbank.addTimeLock(locked, lockedAmount + 300, now + 600, {
        from: locker
      });
      timeLockLength = await cbank.getTimeLockLength(locked);
      assert.equal(timeLockLength, 4, "time locked: 4 time");
      timeLockedAmount = await cbank.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount * 4 + 600, "time locked amount is different");
      timeLockInfo = await cbank.getTimeLock(locked, 0);
      assert.equal(timeLockInfo[0], lockedAmount, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 300, "expiredAt is not set well");
      timeLockInfo = await cbank.getTimeLock(locked, 1);
      assert.equal(timeLockInfo[0], lockedAmount + 100, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 400, "expiredAt is not set well");
      timeLockInfo = await cbank.getTimeLock(locked, 2);
      assert.equal(timeLockInfo[0], lockedAmount + 200, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 500, "expiredAt is not set well");
      timeLockInfo = await cbank.getTimeLock(locked, 3);
      assert.equal(timeLockInfo[0], lockedAmount + 300, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      try {
        await cbank.removeTimeLock(locked, 2, { from: locker });
      } catch (e) {}
      timeLockLength = await cbank.getTimeLockLength(locked);
      assert.equal(timeLockLength, 4, "time locked: 4 time");
      await cbank.removeTimeLock(locked, 1, { from: owner });
      timeLockLength = await cbank.getTimeLockLength(locked);
      assert.equal(timeLockLength, 3, "time locked: 3 time");
      timeLockInfo = await cbank.getTimeLock(locked, 0);
      assert.equal(timeLockInfo[0], lockedAmount, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 300, "expiredAt is not set well");
      timeLockInfo = await cbank.getTimeLock(locked, 1);
      assert.equal(timeLockInfo[0], lockedAmount + 300, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockInfo = await cbank.getTimeLock(locked, 2);
      assert.equal(timeLockInfo[0], lockedAmount + 200, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 500, "expiredAt is not set well");
      timeLockedAmount = await cbank.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount * 3 + 500, "time locked amount is different");
      await cbank.removeTimeLock(locked, 2, { from: owner });
      timeLockLength = await cbank.getTimeLockLength(locked);
      assert.equal(timeLockLength, 2, "time locked: 2 time");
      timeLockInfo = await cbank.getTimeLock(locked, 0);
      assert.equal(timeLockInfo[0], lockedAmount, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 300, "expiredAt is not set well");
      timeLockInfo = await cbank.getTimeLock(locked, 1);
      assert.equal(timeLockInfo[0], lockedAmount + 300, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockedAmount = await cbank.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount * 2 + 300, "time locked amount is different");
      await cbank.removeTimeLock(locked, 0, { from: owner });
      timeLockLength = await cbank.getTimeLockLength(locked);
      assert.equal(timeLockLength, 1, "time locked: 2 time");
      timeLockInfo = await cbank.getTimeLock(locked, 0);
      assert.equal(timeLockInfo[0], lockedAmount + 300, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockedAmount = await cbank.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount + 300, "time locked amount is different");
      await cbank.addTimeLock(locked, lockedAmount + 100, now + 400, {
        from: locker
      });
      timeLockLength = await cbank.getTimeLockLength(locked);
      assert.equal(timeLockLength, 2, "time locked: 2 time");
      timeLockedAmount = await cbank.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount * 2 + 400, "time locked amount is different");
      timeLockInfo = await cbank.getTimeLock(locked, 0);
      assert.equal(timeLockInfo[0], lockedAmount + 300, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockInfo = await cbank.getTimeLock(locked, 1);
      assert.equal(timeLockInfo[0], lockedAmount + 100, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 400, "expiredAt is not set well");
    });
    it("4-4 should time lock and transfer", async () => {
      let cbank = await CBANK.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      let now = Date.now();
      let timeLockLength = 0;
      let timeLockedAmount = 0;
      await cbank.addLocker(locker, { from: owner });
      isLocker = await cbank.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await cbank.transfer(locked2, transferredAmount, { from: owner });
      balance = await cbank.balanceOf(locked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await cbank.addTimeLock(locked2, lockedAmount * 4 + 100, now + 300, {
        from: locker
      });
      timeLockLength = await cbank.getTimeLockLength(locked2);
      assert.equal(timeLockLength, 1, "time locked: 1 time");
      timeLockedAmount = await cbank.getTimeLockedAmount(locked2);
      assert.equal(timeLockedAmount, lockedAmount * 4 + 100, "time locked amount is different");
      try {
        await cbank.transfer(owner, lockedAmount, { from: locked2 });
      } catch (e) {}
      balance = await cbank.balanceOf(locked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await cbank.transfer(owner, lockedAmount - 100, { from: locked2 });
      balance = await cbank.balanceOf(locked2);
      assert.equal(transferredAmount - lockedAmount + 100, balance.valueOf(), "transfer failed");
    });
    it("4-5 should time lock expires", async () => {
      let cbank = await CBANK.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      let now = Math.round(new Date().getTime() / 1000);
      let timeLockLength = 0;
      let timeLockedAmount = 0;
      await cbank.addLocker(locker, { from: owner });
      isLocker = await cbank.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await cbank.transfer(timeLocked1, transferredAmount, { from: owner });
      balance = await cbank.balanceOf(timeLocked1);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await cbank.addTimeLock(timeLocked1, lockedAmount * 4 + 100, now + 2, {
        from: locker
      });
      timeLockLength = await cbank.getTimeLockLength(timeLocked1);
      assert.equal(timeLockLength, 1, "time locked: 1 time");
      timeLockedAmount = await cbank.getTimeLockedAmount(timeLocked1);
      assert.equal(timeLockedAmount, lockedAmount * 4 + 100, "time locked amount is different");
      try {
        await cbank.transfer(owner, lockedAmount, { from: timeLocked1 });
      } catch (e) {}
      balance = await cbank.balanceOf(timeLocked1);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      timeLockInfo = await cbank.getTimeLock(timeLocked1, 0);
      assert.equal(timeLockInfo[0], lockedAmount * 4 + 100, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 2, "expiredAt is not set well");
      await timeTravel(3);
      timeLockedAmount = await cbank.getTimeLockedAmount(timeLocked1);
      assert.equal(timeLockedAmount, 0, "time locked amount is different");
      await cbank.transfer(owner, lockedAmount, { from: timeLocked1 });
      balance = await cbank.balanceOf(timeLocked1);
      assert.equal(transferredAmount - lockedAmount, balance.valueOf(), "transfer failed");
    });
    it("4-6 should investor lock add and remove work right", async () => {
      let cbank = await CBANK.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 5000000;
      let balance = 0;
      let isLocker = false;
      let months = 5;
      let investorLockedAmount = 0;
      let investorLockInfo = null;
      await cbank.addLocker(locker, { from: owner });
      isLocker = await cbank.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await cbank.transfer(investorLocked1, transferredAmount, { from: owner });
      balance = await cbank.balanceOf(investorLocked1);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await cbank.addInvestorLock(investorLocked1, months, {
        from: locker
      });
      investorLockedAmount = await cbank.getInvestorLockedAmount(investorLocked1);
      assert.equal(investorLockedAmount, lockedAmount, "investor locked amount is different");
      investorLockInfo = await cbank.getInvestorLock(investorLocked1);
      assert.equal(investorLockInfo[0], lockedAmount, "investor locked amount is not set well");
      assert.equal(investorLockInfo[1], months, "investor locked months is not set well");
      try {
        await cbank.removeInvestorLock(investorLocked1, { from: locker });
      } catch (e) {}
      investorLockInfo = await cbank.getInvestorLock(investorLocked1);
      assert.equal(investorLockInfo[0], lockedAmount, "investor locked amount is not set well");
      investorLockedAmount = await cbank.getInvestorLockedAmount(investorLocked1);
      assert.equal(investorLockedAmount, lockedAmount, "investor locked amount is different");
      try {
        await cbank.removeInvestorLock(investorLocked1, { from: owner });
      } catch (e) {}
      investorLockInfo = await cbank.getInvestorLock(investorLocked1);
      assert.equal(investorLockInfo[0], 0, "investor locked amount is not set well");
      investorLockedAmount = await cbank.getInvestorLockedAmount(investorLocked1);
      assert.equal(investorLockedAmount, 0, "investor locked amount is different");
    });
    it("4-7 should investor lock and transfer", async () => {
      let cbank = await CBANK.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 5000000;
      let months = 5;
      let balance = 0;
      let isLocker = false;
      let investorLockedAmount = 0;
      await cbank.addLocker(locker, { from: owner });
      isLocker = await cbank.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await cbank.transfer(investorLocked2, transferredAmount, { from: owner });
      balance = await cbank.balanceOf(investorLocked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await cbank.addInvestorLock(investorLocked2, months, {
        from: locker
      });
      investorLockedAmount = await cbank.getInvestorLockedAmount(investorLocked2);
      assert.equal(investorLockedAmount, lockedAmount, "investor locked amount is different");
      try {
        await cbank.transfer(owner, lockedAmount, { from: investorLocked2 });
      } catch (e) {}
      balance = await cbank.balanceOf(investorLocked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer lock failed");
    });
    it("4-8 should investor lock expires", async () => {
      let cbank = await CBANK.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 5000000;
      let balance = 0;
      let months = 5;
      let isLocker = false;
      let oneMonthToSec = 60 * 60 * 24 * 31;
      let releasedAmountPerMonth = 1000000;
      let investorLockedAmount = 0;
      await cbank.addLocker(locker, { from: owner });
      isLocker = await cbank.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await cbank.transfer(investorLocked3, transferredAmount, { from: owner });
      balance = await cbank.balanceOf(investorLocked3);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await cbank.addInvestorLock(investorLocked3, months, {
        from: locker
      });
      investorLockedAmount = await cbank.getInvestorLockedAmount(investorLocked3);
      assert.equal(investorLockedAmount, lockedAmount, "investor locked amount is different");
      try {
        await cbank.transfer(owner, lockedAmount, { from: investorLocked3 });
      } catch (e) {}
      balance = await cbank.balanceOf(investorLocked3);
      assert.equal(transferredAmount, balance.valueOf(), "transfer lock failed");
      await timeTravel(oneMonthToSec + 1);
      investorLockedAmount = await cbank.getInvestorLockedAmount(investorLocked3);
      assert.equal(investorLockedAmount, lockedAmount - releasedAmountPerMonth, "investor locked amount is different");
      await cbank.transfer(owner, releasedAmountPerMonth, {
        from: investorLocked3
      });
      balance = await cbank.balanceOf(investorLocked3);
      assert.equal(transferredAmount - releasedAmountPerMonth, balance.valueOf(), "transfer failed");
    });
  });
  describe("5. token recover test", () => {
    it("5-1 should revert contract address's token to owner", async () => {
      let cbank = await CBANK.deployed();
      const contractAddress = cbank.address;
      let prevOwnerBalance = await cbank.balanceOf(owner);
      let amount = 1000000;
      await cbank.transfer(contractAddress, amount, { from: owner });
      let contractBalance = await cbank.balanceOf(contractAddress);
      assert.equal(amount, contractBalance.valueOf(), "transfer failed");
      await cbank.recoverERC20(contractAddress, amount, { from: owner });
      let ownerBalance = await cbank.balanceOf(owner);
      assert.equal(prevOwnerBalance.toString(), ownerBalance.toString(), "recover failed");
    });
    it("5-2 should not revert contract address's token to owner", async () => {
      let cbank = await CBANK.deployed();
      const contractAddress = cbank.address;
      let prevOwnerBalance = await cbank.balanceOf(owner);
      let amount = 1000000;
      await cbank.transfer(contractAddress, amount, { from: owner });
      let contractBalance = await cbank.balanceOf(contractAddress);
      assert.equal(amount, contractBalance.valueOf(), "transfer failed");
      try {
        await cbank.recoverERC20(contractAddress, amount, { from: ordinary });
      } catch (e) {}
      let ownerBalance = await cbank.balanceOf(owner);
      assert.notEqual(prevOwnerBalance.toString(), ownerBalance.toString(), "recover succeed");
    });
  });
});
