// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";




// Note that this pool has no minter key of d.ETH (rewards).
// Instead, the governance will distribute tokens directly to the Rewards contract.
contract dETHRewardPools {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // governance
    address public operator;

    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
    }

    // Info of each pool.
    struct PoolInfo {
        IERC20 token; // Address of LP token contract.
        uint256 allocPoint; // How many allocation points assigned to this pool. d.ETH to distribute.
        uint256 lastRewardTime; // Last time that d.ETH distribution occurs.
        uint256 accDETHPerShare; // Accumulated d.ETH per share, times 1e18. See below.
        uint16 depositFeeBP; //Deposit Fee
        bool isStarted; // if lastRewardBlock has passed
    }

    IERC20 public deth;
    address public feeAddress;

    // Info of each pool.
    PoolInfo[] public poolInfo;

    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;

    // The time when d.ETH mining starts.
    uint256 public poolStartTime;

    // The time when d.ETH mining ends.
    uint256 public poolEndTime;

    // MAINNET
    uint256 public dethPerSecond = 0.0035225443 ether; // 35k d.ETH / (365 * 24h * 60min * 60s)
    uint256 public runningTime = 115 days; // 1 year
    uint256 public constant TOTAL_REWARDS = 4000000 ether;
    uint16 depositFeeBP;
    // END MAINNET

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount);
    event setPool(uint256 indexed pid, address lpToken, uint256 allocPoint, uint256 depositFeeBP);

    constructor(
        address _deth,
        uint256 _poolStartTime,
        uint16 _depositFeeBP,
        address _depositfeeAddress
    ) public {
        require(block.timestamp < _poolStartTime, "late");
        if (_deth != address(0)) deth = IERC20(_deth);
        poolStartTime = _poolStartTime;
        poolEndTime = poolStartTime + runningTime;
        depositFeeBP = _depositFeeBP;

        feeAddress = _depositfeeAddress;
        operator = msg.sender;
    }

    modifier onlyOperator() {
        require(operator == msg.sender, "dETHRewardPool: caller is not the operator");
        _;
    }

    function checkPoolDuplicate(IERC20 _token) internal view {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            require(poolInfo[pid].token != _token, "dETHRewardPool: existing pool?");
        }
    }

    // Add a new token to the pool. Can only be called by the owner.
    function add(
        uint256 _allocPoint,
        IERC20 _token,
        bool _withUpdate,
        uint16 _depositFeeBP,
        uint256 _lastRewardTime
    ) public onlyOperator {
        checkPoolDuplicate(_token);
        require(_depositFeeBP <= 100, "add: invalid deposit fee basis points");
        if (_withUpdate) {
            massUpdatePools();
        }
        if (block.timestamp < poolStartTime) {
            // chef is sleeping
            if (_lastRewardTime == 0) {
                _lastRewardTime = poolStartTime;
            } else {
                if (_lastRewardTime < poolStartTime) {
                    _lastRewardTime = poolStartTime;
                }
            }
        } else {
            // chef is cooking
            if (_lastRewardTime == 0 || _lastRewardTime < block.timestamp) {
                _lastRewardTime = block.timestamp;
            }
        }
        bool _isStarted = (_lastRewardTime <= poolStartTime) || (_lastRewardTime <= block.timestamp);
        poolInfo.push(PoolInfo({token: _token, allocPoint: _allocPoint, depositFeeBP: _depositFeeBP, lastRewardTime: _lastRewardTime, accDETHPerShare: 0, isStarted: _isStarted}));
        if (_isStarted) {
            totalAllocPoint = totalAllocPoint.add(_allocPoint);
        }
    }

    // Update the given pool's d.ETH allocation point. Can only be called by the owner.
    function set(uint256 _pid, uint256 _allocPoint, uint16 _depositFeeBP) public onlyOperator {
      require(_depositFeeBP <= 0, "Deposit Fee Cannot equal more than 0%");
        massUpdatePools();
        PoolInfo storage pool = poolInfo[_pid];
        if (pool.isStarted) {
            totalAllocPoint = totalAllocPoint.sub(pool.allocPoint).add(_allocPoint);
        }
        pool.allocPoint = _allocPoint;
        pool.depositFeeBP = _depositFeeBP;
    }

    // Update every pools deposit fee
    function setGlobalDepositFee(uint16 _globalDepositFeeBP) external onlyOperator {
        require(_globalDepositFeeBP <= 0, "set: invalid deposit fee basis points");
        for (uint256 pid = 0; pid < poolInfo.length; ++pid) {                
        emit setPool(pid, address(poolInfo[pid].token), poolInfo[pid].allocPoint, _globalDepositFeeBP);               
        }
    }

    // Return accumulate rewards over the given _from to _to block.
    function getGeneratedReward(uint256 _fromTime, uint256 _toTime) public view returns (uint256) {
        if (_fromTime >= _toTime) return 0;
        if (_toTime >= poolEndTime) {
            if (_fromTime >= poolEndTime) return 0;
            if (_fromTime <= poolStartTime) return poolEndTime.sub(poolStartTime).mul(dethPerSecond);
            return poolEndTime.sub(_fromTime).mul(dethPerSecond);
        } else {
            if (_toTime <= poolStartTime) return 0;
            if (_fromTime <= poolStartTime) return _toTime.sub(poolStartTime).mul(dethPerSecond);
            return _toTime.sub(_fromTime).mul(dethPerSecond);
        }
    }

    // View function to see pending d.ETH on frontend.
    function pendingdETH(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accDETHPerShare = pool.accDETHPerShare;
        uint256 tokenSupply = pool.token.balanceOf(address(this));
        if (block.timestamp > pool.lastRewardTime && tokenSupply != 0) {
            uint256 _generatedReward = getGeneratedReward(pool.lastRewardTime, block.timestamp);
            uint256 _dethReward = _generatedReward.mul(pool.allocPoint).div(totalAllocPoint);
            accDETHPerShare = accDETHPerShare.add(_dethReward.mul(1e18).div(tokenSupply));
        }
        return user.amount.mul(accDETHPerShare).div(1e18).sub(user.rewardDebt);
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }
        uint256 tokenSupply = pool.token.balanceOf(address(this));
        if (tokenSupply == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }
        if (!pool.isStarted) {
            pool.isStarted = true;
            totalAllocPoint = totalAllocPoint.add(pool.allocPoint);
        }
        if (totalAllocPoint > 0) {
            uint256 _generatedReward = getGeneratedReward(pool.lastRewardTime, block.timestamp);
            uint256 _dethReward = _generatedReward.mul(pool.allocPoint).div(totalAllocPoint);
            pool.accDETHPerShare = pool.accDETHPerShare.add(_dethReward.mul(1e18).div(tokenSupply));
        }
        pool.lastRewardTime = block.timestamp;
    }

    // Deposit LP tokens.
    function deposit(uint256 _pid, uint256 _amount) public {
        address _sender = msg.sender;
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 _pending = user.amount.mul(pool.accDETHPerShare).div(1e18).sub(user.rewardDebt);
            if (_pending > 0) {
                pool.token.safeTransfer(_sender, _pending);
                emit RewardPaid(_sender, _pending);
            }
        }
        if (_amount > 0) {
            pool.token.safeTransferFrom(_sender, address(this), _amount);
            if (pool.depositFeeBP > 0) {
                uint256 depositFee = _amount.mul(pool.depositFeeBP).div(10000);
                pool.token.safeTransfer(feeAddress, depositFee);
                user.amount = user.amount.add(_amount).sub(depositFee);
            } else {
                user.amount = user.amount.add(_amount);
            }
        user.rewardDebt = user.amount.mul(pool.accDETHPerShare).div(1e18);
        emit Deposit(_sender, _pid, _amount);
       }
    }

    // Withdraw LP tokens.
    function withdraw(uint256 _pid, uint256 _amount) public {
        address _sender = msg.sender;
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(_pid);
        uint256 _pending = user.amount.mul(pool.accDETHPerShare).div(1e18).sub(user.rewardDebt);
        if (_pending > 0) {
            safedETHTransfer(_sender, _pending);
            emit RewardPaid(_sender, _pending);
        }
        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.token.safeTransfer(_sender, _amount);
        }
        user.rewardDebt = user.amount.mul(pool.accDETHPerShare).div(1e18);
        emit Withdraw(_sender, _pid, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 _amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        pool.token.safeTransfer(msg.sender, _amount);
        emit EmergencyWithdraw(msg.sender, _pid, _amount);
    }

    // Safe d.ETH transfer function, just in case a rounding error causes pool to not have enough d.ETH.
    function safedETHTransfer(address _to, uint256 _amount) internal {
        uint256 _dETHBalance = deth.balanceOf(address(this));
        if (_dETHBalance > 0) {
            if (_amount > _dETHBalance) {
                deth.safeTransfer(_to, _dETHBalance);
            } else {
                deth.safeTransfer(_to, _amount);
            }
        }
    }

    function setOperator(address _operator) external onlyOperator {
        operator = _operator;
    }

    function governanceRecoverUnsupported(
        IERC20 _token,
        uint256 amount,
        address to
    ) external onlyOperator {
        if (block.timestamp < poolEndTime + 90 days) {
            // do not allow to drain core token (d.ETH or lps) if less than 90 days after pool ends
            require(_token != deth, "deth");
            uint256 length = poolInfo.length;
            for (uint256 pid = 0; pid < length; ++pid) {
                PoolInfo storage pool = poolInfo[pid];
                require(_token != pool.token, "pool.token");
            }
        }
        _token.safeTransfer(to, amount);
    }
}