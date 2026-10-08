#!/usr/bin/env python3
"""Compatibilidade do Kiba: mantém o processo JSONL antigo e usa o cérebro modular novo."""
import os,sys
ROOT=os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path: sys.path.insert(0,ROOT)
from kiba.main import main
if __name__=="__main__": main()
