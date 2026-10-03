window.HF = window.HF || {};
// Draft calibration measured against the original 2792 × 1278 PNG.
HF.riscvGeometry = {
  "id": "riscv-sc",
  "presentation": "net-graph",
  "image": "assets/riscv-single-cycle.png",
  "viewBox": {
    "width": 2792,
    "height": 1278
  },
  "viewport": {
    "fit": {
      "x": 27,
      "y": 34,
      "right": 38,
      "bottom": 34
    },
    "focus": {
      "x": 55,
      "y": 95,
      "right": 82,
      "bottom": 109
    }
  },
  "nodes": [
    {
      "id": "mux_pc",
      "box": {
        "x": 97,
        "y": 195,
        "width": 48,
        "height": 153
      }
    },
    {
      "id": "pc",
      "box": {
        "x": 293,
        "y": 206,
        "width": 87,
        "height": 134
      }
    },
    {
      "id": "plus4",
      "box": {
        "x": 292,
        "y": 402,
        "width": 89,
        "height": 89
      }
    },
    {
      "id": "icache",
      "box": {
        "x": 509,
        "y": 206,
        "width": 90,
        "height": 134
      }
    },
    {
      "id": "regfile",
      "box": {
        "x": 770,
        "y": 196,
        "width": 305,
        "height": 348
      }
    },
    {
      "id": "immgen",
      "box": {
        "x": 813,
        "y": 663,
        "width": 219,
        "height": 89
      }
    },
    {
      "id": "brc",
      "box": {
        "x": 1163,
        "y": 576,
        "width": 218,
        "height": 89
      }
    },
    {
      "id": "opa_mux",
      "box": {
        "x": 1445,
        "y": 151,
        "width": 45,
        "height": 153
      }
    },
    {
      "id": "opb_mux",
      "box": {
        "x": 1575,
        "y": 371,
        "width": 45,
        "height": 153
      }
    },
    {
      "id": "alu",
      "box": {
        "x": 1791,
        "y": 151,
        "width": 134,
        "height": 371
      }
    },
    {
      "id": "lsu",
      "box": {
        "x": 2097,
        "y": 445,
        "width": 134,
        "height": 175
      }
    },
    {
      "id": "control",
      "box": {
        "x": 55,
        "y": 1054,
        "width": 2522,
        "height": 175
      }
    },
    {
      "id": "wb_mux",
      "box": {
        "x": 2401,
        "y": 239,
        "width": 48,
        "height": 198
      }
    },
    {
      "id": "pc_debug",
      "box": {
        "x": 2465,
        "y": 794,
        "width": 45,
        "height": 89
      }
    },
    {
      "id": "insn_vld_reg",
      "box": {
        "x": 2465,
        "y": 903,
        "width": 45,
        "height": 89
      }
    },
    {
      "id": "io",
      "box": {
        "x": 2588,
        "y": 531,
        "width": 134,
        "height": 265
      }
    }
  ],
  "nets": [
    {
      "id": "pc_next",
      "junctions": [],
      "segments": [
        {
          "id": "pc_next-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 143,
              "y": 271
            },
            {
              "x": 293,
              "y": 271
            }
          ]
        }
      ]
    },
    {
      "id": "pc",
      "junctions": [
        {
          "id": "j1",
          "x": 446,
          "y": 271
        }
      ],
      "segments": [
        {
          "id": "pc-s1",
          "from": "source",
          "to": "j1",
          "points": [
            {
              "x": 380,
              "y": 271
            },
            {
              "x": 446,
              "y": 271
            }
          ]
        },
        {
          "id": "pc-s2",
          "from": "j1",
          "to": "icache",
          "points": [
            {
              "x": 446,
              "y": 271
            },
            {
              "x": 510,
              "y": 271
            }
          ]
        },
        {
          "id": "pc-s3",
          "from": "j1",
          "to": "plus4",
          "points": [
            {
              "x": 446,
              "y": 271
            },
            {
              "x": 446,
              "y": 445
            },
            {
              "x": 380,
              "y": 445
            }
          ]
        },
        {
          "id": "pc-s4",
          "from": "j1",
          "to": "pc_debug",
          "points": [
            {
              "x": 446,
              "y": 271
            },
            {
              "x": 446,
              "y": 837
            },
            {
              "x": 2465,
              "y": 837
            }
          ]
        },
        {
          "id": "pc-s5",
          "from": "source",
          "to": "opa_mux",
          "points": [
            {
              "x": 1336,
              "y": 184
            },
            {
              "x": 1445,
              "y": 184
            }
          ]
        }
      ]
    },
    {
      "id": "instr",
      "junctions": [
        {
          "id": "j1",
          "x": 663,
          "y": 271
        }
      ],
      "segments": [
        {
          "id": "instr-s1",
          "from": "source",
          "to": "j1",
          "points": [
            {
              "x": 598,
              "y": 271
            },
            {
              "x": 663,
              "y": 271
            }
          ]
        },
        {
          "id": "instr-s2",
          "from": "j1",
          "to": "rs1",
          "points": [
            {
              "x": 663,
              "y": 271
            },
            {
              "x": 770,
              "y": 271
            }
          ]
        },
        {
          "id": "instr-s3",
          "from": "j1",
          "to": "rs2",
          "points": [
            {
              "x": 663,
              "y": 271
            },
            {
              "x": 663,
              "y": 337
            },
            {
              "x": 770,
              "y": 337
            }
          ]
        },
        {
          "id": "instr-s4",
          "from": "j1",
          "to": "rd",
          "points": [
            {
              "x": 663,
              "y": 271
            },
            {
              "x": 663,
              "y": 402
            },
            {
              "x": 770,
              "y": 402
            }
          ]
        },
        {
          "id": "instr-s5",
          "from": "j1",
          "to": "immgen",
          "points": [
            {
              "x": 663,
              "y": 271
            },
            {
              "x": 663,
              "y": 707
            },
            {
              "x": 813,
              "y": 707
            }
          ]
        },
        {
          "id": "instr-s6",
          "from": "j1",
          "to": "control",
          "points": [
            {
              "x": 663,
              "y": 271
            },
            {
              "x": 663,
              "y": 1054
            }
          ]
        }
      ]
    },
    {
      "id": "rs1_addr",
      "junctions": [],
      "segments": [
        {
          "id": "rs1_addr-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 663,
              "y": 271
            },
            {
              "x": 770,
              "y": 271
            }
          ]
        }
      ]
    },
    {
      "id": "rs2_addr",
      "junctions": [],
      "segments": [
        {
          "id": "rs2_addr-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 663,
              "y": 337
            },
            {
              "x": 770,
              "y": 337
            }
          ]
        }
      ]
    },
    {
      "id": "rd_addr",
      "junctions": [],
      "segments": [
        {
          "id": "rd_addr-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 663,
              "y": 402
            },
            {
              "x": 770,
              "y": 402
            }
          ]
        }
      ]
    },
    {
      "id": "pc_four",
      "junctions": [],
      "segments": [
        {
          "id": "pc_four-s1",
          "from": "source",
          "to": "mux_pc",
          "points": [
            {
              "x": 292,
              "y": 445
            },
            {
              "x": 55,
              "y": 445
            },
            {
              "x": 55,
              "y": 312
            },
            {
              "x": 97,
              "y": 312
            }
          ]
        },
        {
          "id": "pc_four-s2",
          "from": "source",
          "to": "wb_mux",
          "points": [
            {
              "x": 2270,
              "y": 261
            },
            {
              "x": 2401,
              "y": 261
            }
          ]
        }
      ]
    },
    {
      "id": "rs1_data",
      "junctions": [
        {
          "id": "j1",
          "x": 1227,
          "y": 271
        }
      ],
      "segments": [
        {
          "id": "rs1_data-s1",
          "from": "source",
          "to": "j1",
          "points": [
            {
              "x": 1076,
              "y": 271
            },
            {
              "x": 1227,
              "y": 271
            }
          ]
        },
        {
          "id": "rs1_data-s2",
          "from": "j1",
          "to": "opa_mux",
          "points": [
            {
              "x": 1227,
              "y": 271
            },
            {
              "x": 1445,
              "y": 271
            }
          ]
        },
        {
          "id": "rs1_data-s3",
          "from": "j1",
          "to": "brc",
          "points": [
            {
              "x": 1227,
              "y": 271
            },
            {
              "x": 1227,
              "y": 576
            }
          ]
        }
      ]
    },
    {
      "id": "rs2_data",
      "junctions": [
        {
          "id": "j1",
          "x": 1316,
          "y": 402
        }
      ],
      "segments": [
        {
          "id": "rs2_data-s1",
          "from": "source",
          "to": "j1",
          "points": [
            {
              "x": 1076,
              "y": 402
            },
            {
              "x": 1316,
              "y": 402
            }
          ]
        },
        {
          "id": "rs2_data-s2",
          "from": "j1",
          "to": "opb_mux",
          "points": [
            {
              "x": 1316,
              "y": 402
            },
            {
              "x": 1575,
              "y": 402
            }
          ]
        },
        {
          "id": "rs2_data-s3",
          "from": "j1",
          "to": "brc",
          "points": [
            {
              "x": 1316,
              "y": 402
            },
            {
              "x": 1316,
              "y": 576
            }
          ]
        },
        {
          "id": "rs2_data-s4",
          "from": "source",
          "to": "lsu",
          "points": [
            {
              "x": 1966,
              "y": 576
            },
            {
              "x": 2097,
              "y": 576
            }
          ]
        }
      ]
    },
    {
      "id": "operand_a",
      "junctions": [],
      "segments": [
        {
          "id": "operand_a-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 1490,
              "y": 229
            },
            {
              "x": 1791,
              "y": 229
            }
          ]
        }
      ]
    },
    {
      "id": "operand_b",
      "junctions": [],
      "segments": [
        {
          "id": "operand_b-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 1620,
              "y": 446
            },
            {
              "x": 1791,
              "y": 446
            }
          ]
        }
      ]
    },
    {
      "id": "alu_data",
      "junctions": [
        {
          "id": "j1",
          "x": 2009,
          "y": 338
        }
      ],
      "segments": [
        {
          "id": "alu_data-s1",
          "from": "source",
          "to": "j1",
          "points": [
            {
              "x": 1925,
              "y": 338
            },
            {
              "x": 2009,
              "y": 338
            }
          ]
        },
        {
          "id": "alu_data-s2",
          "from": "j1",
          "to": "wb_mux",
          "points": [
            {
              "x": 2009,
              "y": 338
            },
            {
              "x": 2401,
              "y": 338
            }
          ]
        },
        {
          "id": "alu_data-s3",
          "from": "j1",
          "to": "lsu",
          "points": [
            {
              "x": 2009,
              "y": 338
            },
            {
              "x": 2009,
              "y": 490
            },
            {
              "x": 2097,
              "y": 490
            }
          ]
        },
        {
          "id": "alu_data-s4",
          "from": "j1",
          "to": "mux_pc",
          "points": [
            {
              "x": 2009,
              "y": 338
            },
            {
              "x": 2098,
              "y": 338
            },
            {
              "x": 2098,
              "y": 98
            },
            {
              "x": 55,
              "y": 98
            },
            {
              "x": 55,
              "y": 229
            },
            {
              "x": 97,
              "y": 229
            }
          ]
        }
      ]
    },
    {
      "id": "ld_data",
      "junctions": [],
      "segments": [
        {
          "id": "ld_data-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 2229,
              "y": 490
            },
            {
              "x": 2271,
              "y": 490
            },
            {
              "x": 2271,
              "y": 402
            },
            {
              "x": 2401,
              "y": 402
            }
          ]
        }
      ]
    },
    {
      "id": "wb_data",
      "junctions": [],
      "segments": [
        {
          "id": "wb_data-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 2448,
              "y": 338
            },
            {
              "x": 2575,
              "y": 338
            },
            {
              "x": 2575,
              "y": 55
            },
            {
              "x": 923,
              "y": 55
            },
            {
              "x": 923,
              "y": 196
            }
          ]
        }
      ]
    },
    {
      "id": "imm",
      "junctions": [],
      "segments": [
        {
          "id": "imm-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 1032,
              "y": 707
            },
            {
              "x": 1532,
              "y": 707
            },
            {
              "x": 1532,
              "y": 490
            },
            {
              "x": 1575,
              "y": 490
            }
          ]
        }
      ]
    },
    {
      "id": "pc_sel",
      "junctions": [],
      "segments": [
        {
          "id": "pc_sel-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 119,
              "y": 1054
            },
            {
              "x": 119,
              "y": 348
            }
          ]
        }
      ]
    },
    {
      "id": "rd_wren",
      "junctions": [],
      "segments": [
        {
          "id": "rd_wren-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 727,
              "y": 1054
            },
            {
              "x": 727,
              "y": 466
            },
            {
              "x": 770,
              "y": 466
            }
          ]
        }
      ]
    },
    {
      "id": "insn_vld",
      "junctions": [],
      "segments": [
        {
          "id": "insn_vld-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 923,
              "y": 1054
            },
            {
              "x": 923,
              "y": 947
            },
            {
              "x": 2465,
              "y": 947
            }
          ]
        }
      ]
    },
    {
      "id": "br_un",
      "junctions": [],
      "segments": [
        {
          "id": "br_un-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 1097,
              "y": 1054
            },
            {
              "x": 1097,
              "y": 621
            },
            {
              "x": 1163,
              "y": 621
            }
          ]
        }
      ]
    },
    {
      "id": "br_less",
      "junctions": [],
      "segments": [
        {
          "id": "br_less-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 1207,
              "y": 664
            },
            {
              "x": 1207,
              "y": 1054
            }
          ]
        }
      ]
    },
    {
      "id": "br_equal",
      "junctions": [],
      "segments": [
        {
          "id": "br_equal-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 1336,
              "y": 664
            },
            {
              "x": 1336,
              "y": 1054
            }
          ]
        }
      ]
    },
    {
      "id": "opa_sel",
      "junctions": [],
      "segments": [
        {
          "id": "opa_sel-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 1467,
              "y": 1054
            },
            {
              "x": 1467,
              "y": 303
            }
          ]
        }
      ]
    },
    {
      "id": "opb_sel",
      "junctions": [],
      "segments": [
        {
          "id": "opb_sel-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 1596,
              "y": 1054
            },
            {
              "x": 1596,
              "y": 522
            }
          ]
        }
      ]
    },
    {
      "id": "alu_op",
      "junctions": [],
      "segments": [
        {
          "id": "alu_op-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 1858,
              "y": 1054
            },
            {
              "x": 1858,
              "y": 503
            }
          ]
        }
      ]
    },
    {
      "id": "mem_wren",
      "junctions": [],
      "segments": [
        {
          "id": "mem_wren-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 2162,
              "y": 1054
            },
            {
              "x": 2162,
              "y": 619
            }
          ]
        }
      ]
    },
    {
      "id": "wb_sel",
      "junctions": [],
      "segments": [
        {
          "id": "wb_sel-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 2424,
              "y": 1054
            },
            {
              "x": 2424,
              "y": 435
            }
          ]
        }
      ]
    },
    {
      "id": "o_pc_debug",
      "junctions": [],
      "segments": [
        {
          "id": "o_pc_debug-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 2510,
              "y": 837
            },
            {
              "x": 2703,
              "y": 837
            }
          ]
        }
      ]
    },
    {
      "id": "o_insn_vld",
      "junctions": [],
      "segments": [
        {
          "id": "o_insn_vld-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 2510,
              "y": 947
            },
            {
              "x": 2703,
              "y": 947
            }
          ]
        }
      ]
    },
    {
      "id": "io_link",
      "junctions": [],
      "segments": [
        {
          "id": "io_link-s1",
          "from": "source",
          "to": "sink",
          "points": [
            {
              "x": 2229,
              "y": 576
            },
            {
              "x": 2703,
              "y": 576
            }
          ]
        }
      ]
    }
  ]
};
