-- Migration: Add STOCK_CONTROLLER role to user_role enum
-- Date: 2025-01-18
-- Description: Adds support for stock controller users who can manage inventory

-- Add STOCK_CONTROLLER to the user_role enum
-- PostgreSQL requires adding the new value before altering the type
ALTER TYPE user_role ADD VALUE 'STOCK_CONTROLLER' BEFORE 'SUPERVISOR';

-- This migration allows existing users to be assigned the STOCK_CONTROLLER role
-- and enables creation of new stock controller accounts

-- Example: To create a stock controller account, run:
-- INSERT INTO users (user_id, name, email, password_hash, role)
-- VALUES ('USR-SC001', 'Stock Controller', 'stockcontroller@wms.local', '$2b$10$...', 'STOCK_CONTROLLER');
