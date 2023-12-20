const { deployments, getNamedAccounts, ethers } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", function () {
          let fundMe
          let mockV3Aggregator
          let deployer
          const sendValue = ethers.parseEther("1")
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer,
              )
          })

          describe("constructor", function () {
              it("sets the aggregator addresses correctly", async () => {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.target)
              })
          })
          describe("fund", async function () {
              it("Fails if you don't send enough USDT", async function () {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "You need to spend more ETH!",
                  )
              })
              it("update the amount funded data structure", async function () {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.addressToAmountFunded(deployer)
                  assert.equal(response.toString(), sendValue.toString())
              })
              it("Add funder to array of funders", async function () {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getfunder(0)
                  assert.equal(funder, deployer)
              })
          })
          describe("withdraw", async function () {
              beforeEach(async function () {
                  await fundMe.fund({ value: sendValue })
              })
              it("Withdraw ETH from a single founder", async function () {
                  //Arrange
                  const staringFundBalance = await ethers.provider.getBalance(
                      fundMe.target,
                  )
                  const startingDeployBalance =
                      await ethers.provider.getBalance(deployer)
                  //Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { gasUsed, gasPrice } = transactionReceipt
                  const gasCost = gasUsed * gasPrice
                  const endingFundMeBalance = await ethers.provider.getBalance(
                      fundMe.target,
                  )
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer)
                  //Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      staringFundBalance + startingDeployBalance,
                      endingDeployerBalance + gasCost,
                  )
              })
              it("Allow us to withdraw with multiple getFunder", async function () {
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectContract = await fundMe.connect(
                          accounts[i],
                      )
                      await fundMeConnectContract.fund({ value: sendValue })
                  }
                  const startingFunMeBalance = await ethers.provider.getBalance(
                      fundMe.getAddress(),
                  )
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer)

                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  const { gasUsed, gasPrice } = transactionReceipt
                  const gasCost = gasUsed * gasPrice

                  const endingFunMeBalance = await ethers.provider.getBalance(
                      fundMe.getAddress(),
                  )
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer)

                  assert.equal(endingFunMeBalance, 0)
                  assert.equal(
                      startingFunMeBalance + startingDeployerBalance,
                      endingDeployerBalance + gasCost,
                  )

                  await expect(fundMe.getfunder(0)).to.be.reverted

                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.addressToAmountFunded(
                              accounts[i].getAddress(),
                          ),
                          0,
                      )
                  }
              })
              it("CheaperWithraw test...", async function () {
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectContract = await fundMe.connect(
                          accounts[i],
                      )
                      await fundMeConnectContract.fund({ value: sendValue })
                  }
                  const startingFunMeBalance = await ethers.provider.getBalance(
                      fundMe.getAddress(),
                  )
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer)

                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  const { gasUsed, gasPrice } = transactionReceipt
                  const gasCost = gasUsed * gasPrice

                  const endingFunMeBalance = await ethers.provider.getBalance(
                      fundMe.getAddress(),
                  )
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer)

                  assert.equal(endingFunMeBalance, 0)
                  assert.equal(
                      startingFunMeBalance + startingDeployerBalance,
                      endingDeployerBalance + gasCost,
                  )

                  await expect(fundMe.getfunder(0)).to.be.reverted

                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.addressToAmountFunded(
                              accounts[i].getAddress(),
                          ),
                          0,
                      )
                  }
              })

              it("Only allows the owner to withdraw", async function () {
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerConnectedContract =
                      await fundMe.connect(attacker)
                  await expect(
                      attackerConnectedContract.withdraw(),
                  ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner")
              })
          })
      })
