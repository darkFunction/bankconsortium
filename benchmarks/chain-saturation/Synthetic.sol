// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * Synthetic stand-ins for the base-ledger work of each Paladin transaction type, so a plain
 * Besu chain can be saturated without Paladin (which cannot generate 2k tx/s on a laptop).
 * Each mirrors the real transaction's EXPENSIVE operations and roughly its gas:
 *
 *   zk(...)     ≈ Zeto_Anon transfer / lock (~320–350k gas): Groth16-style verification =
 *               5 × ecMul + 5 × ecAdd + one 4-pair ecPairing check (precompiles 0x06–0x08),
 *               plus 4 fresh storage slots (output/locked notes) and an event; the caller sends
 *               a ~1 KB proof-sized blob as calldata.
 *   noto(...)   ≈ Noto transfer (~117k): 1 × ecrecover (notary signature) + 4 fresh slots + event.
 *   pente(...)  ≈ Pente transition (~145k): 2 × ecrecover (endorsements) + 5 fresh slots + event.
 *
 * Writes go to keys derived from a caller-supplied id, so every tx touches distinct slots
 * (like UTXOs) — the best case for parallel execution within one contract.
 */
contract Synthetic {
    // BN254 scalar field order r; (r-1)·G1 = -G1.
    uint256 private constant R = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // G2 generator, EIP-197 order (x_im, x_re, y_im, y_re).
    uint256 private constant G2XI = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 private constant G2XR = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 private constant G2YI = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 private constant G2YR = 8495653923123431417604973247489272438418190587263600148770280649306958101930;

    uint256 private immutable NEG_G1_Y; // -G1 = (1, NEG_G1_Y)

    mapping(bytes32 => uint256) public slots;
    event Zk(bytes32 indexed id, bytes32 a, bytes32 b);
    event Noto(bytes32 indexed id, bytes32 a);
    event Pente(bytes32 indexed id, bytes32 a);

    constructor() {
        (uint256 x, uint256 y) = _ecMul(R - 1);
        require(x == 1, "neg G1");
        NEG_G1_Y = y;
        _pairing4(y); // fail deployment if the pairing inputs are wrong
    }

    function _ecMul(uint256 s) private view returns (uint256, uint256) {
        uint256[3] memory input = [uint256(1), uint256(2), s];
        uint256[2] memory out;
        bool ok;
        assembly { ok := staticcall(gas(), 0x07, input, 0x60, out, 0x40) }
        require(ok, "ecMul");
        return (out[0], out[1]);
    }

    function _ecAdd(uint256 x1, uint256 y1, uint256 x2, uint256 y2) private view returns (uint256, uint256) {
        uint256[4] memory input = [x1, y1, x2, y2];
        uint256[2] memory out;
        bool ok;
        assembly { ok := staticcall(gas(), 0x06, input, 0x80, out, 0x40) }
        require(ok, "ecAdd");
        return (out[0], out[1]);
    }

    // e(G1,G2)·e(-G1,G2)·e(G1,G2)·e(-G1,G2) == 1 — same precompile cost as a 4-pair Groth16 check.
    function _pairing4(uint256 negY) private view {
        uint256[24] memory input;
        for (uint256 i = 0; i < 4; i++) {
            uint256 o = i * 6;
            input[o] = 1;
            input[o + 1] = (i % 2 == 0) ? 2 : negY;
            input[o + 2] = G2XI;
            input[o + 3] = G2XR;
            input[o + 4] = G2YI;
            input[o + 5] = G2YR;
        }
        uint256[1] memory out;
        bool ok;
        assembly { ok := staticcall(gas(), 0x08, input, 0x300, out, 0x20) }
        require(ok && out[0] == 1, "pairing");
    }

    function zk(bytes32 id, bytes calldata /* proofBlob */) external {
        (uint256 ax, uint256 ay) = _ecMul(uint256(id) | 1);
        for (uint256 i = 1; i < 5; i++) {
            (uint256 bx, uint256 by) = _ecMul(uint256(keccak256(abi.encode(id, i))) | 1);
            (ax, ay) = _ecAdd(ax, ay, bx, by);
        }
        (ax, ay) = _ecAdd(ax, ay, 1, 2);
        _pairing4(NEG_G1_Y);
        for (uint256 i = 0; i < 4; i++) slots[keccak256(abi.encode(id, "note", i))] = ax ^ i;
        emit Zk(id, bytes32(ax), bytes32(ay));
    }

    function noto(bytes32 id, bytes32 h, uint8 v, bytes32 r, bytes32 s) external {
        address signer = ecrecover(h, v, r, s);
        require(signer != address(0), "sig");
        for (uint256 i = 0; i < 4; i++) slots[keccak256(abi.encode(id, "coin", i))] = uint256(uint160(signer)) + i;
        emit Noto(id, bytes32(uint256(uint160(signer))));
    }

    function pente(bytes32 id, bytes32 h, uint8 v, bytes32 r, bytes32 s) external {
        address a = ecrecover(h, v, r, s);
        address b = ecrecover(keccak256(abi.encode(h)), v, r, s);
        require(a != address(0), "sig");
        for (uint256 i = 0; i < 5; i++) slots[keccak256(abi.encode(id, "state", i))] = uint256(uint160(a) ^ uint160(b)) + i;
        emit Pente(id, bytes32(uint256(uint160(a))));
    }
}
