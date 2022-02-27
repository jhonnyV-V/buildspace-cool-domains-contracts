const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = ethers.utils;

describe("Domains", function () {
  let deployer, user; 
  const tld = 'otter';
  const name = 'test';
  const record = 'just some data';

  before(async function () {
    [deployer, user] = await ethers.getSigners();
    this.domainContractFactory = await hre.ethers.getContractFactory('Domains');
    this.domainContract = await this.domainContractFactory.deploy(tld);
    this.domainContract.deployed();
    this.domainContractUserInstance = await this.domainContract.connect(user);
  });

  it('It sets the tld correctly', async function () {
    const contractTld = await this.domainContract.tld();
    expect(contractTld).to.be.eq(tld);
  });

  it('Ownership', async function () {
    expect(
      await this.domainContract.isOwner(),
    ).to.be.eq(true);
    expect(
      await this.domainContractUserInstance.isOwner(),
    ).to.be.eq(false);
  });

  it('Test price function', async function () {
    expect(
      await this.domainContract.price('eth'),
    ).to.be.eq(parseEther('0.5'));
    expect(
      await this.domainContract.price('avax'),
    ).to.be.eq(parseEther('0.3'));
    expect(
      await this.domainContract.price('polygon'),
    ).to.be.eq(parseEther('0.1'));
  });

  it('Test valid function', async function () {
    const expectInvalid = await this.domainContract.valid('some-long-string');
    const expectValid = await this.domainContract.valid('short');
    expect(expectInvalid).to.be.eq(false);
    expect(expectValid).to.be.eq(true);
  });

  it('Register A Domain', async function () {
    const tx = await this.domainContract.register(name, { value: parseEther('0.3') });
    await tx.wait();
    expect(
      await this.domainContract.getAddress(name),
    ).to.be.eq(deployer.address);
  });

  it('Register an already register Domain', async function () {
    await expect(
      this.domainContract.register(name),
    ).to.be.revertedWith('AlreadyRegistered()');
  });

  it('Register an invalid domain', async function () {
    await expect(
      this.domainContract.register('another-long-invalid-domain'),
    ).to.be.revertedWith('InvalidName("another-long-invalid-domain")');
  });

  it('Set record', async function () {
    const tx = await this.domainContract.setRecord(name, record);
    await tx.wait();
    expect(
      await this.domainContract.getRecord(name),
    ).to.be.eq(record);
  });

  it('Set an unathorized record', async function () {
    await expect(
      this.domainContractUserInstance.setRecord(name, 'this should not work'),
    ).to.be.revertedWith('Unauthorized()');
  });

  it('User try to withdraw', async function () {
    await expect(
      this.domainContractUserInstance.withdraw(),
    ).to.be.revertedWith('Unauthorized()');
  });

  it('Withdraw', async function () {
    const initialBalance = await ethers.provider.getBalance(deployer.address);
    const tx = await this.domainContract.withdraw();
    await tx.wait();
    const postWithdrawBalance = await ethers.provider.getBalance(deployer.address);
    expect(initialBalance).to.be.lt(postWithdrawBalance);
  });

  it('GetAllNames', async function () {
    const names = await this.domainContract.getAllNames();
    expect(names.length).to.be.eq(1);
    expect(names[0]).to.be.eq(name);
  });

  it('Transfer Ownership', async function () {
    await expect(
      this.domainContractUserInstance.transferOwnership(deployer.address),
    ).to.be.revertedWith('Unauthorized()');
    const tx = await this.domainContract.transferOwnership(user.address);
    await tx.wait();
    expect(
      await this.domainContract.isOwner(),
    ).to.be.eq(false);
    expect(
      await this.domainContractUserInstance.isOwner(),
    ).to.be.eq(true);
  });
});
