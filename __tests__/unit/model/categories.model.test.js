const pool = require('../../../src/services/db');
const model = require('../../../src/models/categoriesModel');

jest.mock('../../../src/services/db', () => ({
  query: jest.fn(),
}));

describe('categoriesModel Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // checkCategoryExists
  // =====================================================
  describe('checkCategoryExists', () => {
    it('should execute category exists query', () => {
      const callback = jest.fn();

      const data = {
        category_id: 1,
      };

      model.checkCategoryExists(data, callback);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT category_id FROM categories'),
        [1],
        callback,
      );
    });
  });

  // =====================================================
  // selectAll
  // =====================================================
  describe('selectAll', () => {
    it('should execute select all categories query', () => {
      const callback = jest.fn();

      model.selectAll(callback);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM categories'),
        callback,
      );
    });
  });

  // =====================================================
  // selectCategory
  // =====================================================
  describe('selectCategory', () => {
    it('should execute select category by id query', () => {
      const callback = jest.fn();

      const data = {
        category_id: 5,
      };

      model.selectCategory(data, callback);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE category_id = $1'),
        [5],
        callback,
      );
    });
  });

  // =====================================================
  // insertCategory
  // =====================================================
  describe('insertCategory', () => {
    it('should execute insert category query', () => {
      const callback = jest.fn();

      const data = {
        category_name: 'Food',
        category_type: 'Expense',
      };

      model.insertCategory(data, callback);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        ['Food', 'Expense'],
        callback,
      );
    });
  });

  // =====================================================
  // updateCategory
  // =====================================================
  describe('updateCategory', () => {
    it('should execute update category query', () => {
      const callback = jest.fn();

      const data = {
        category_id: 2,
        category_name: 'Transport',
        category_type: 'Expense',
      };

      model.updateCategory(data, callback);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE categories'),
        ['Transport', 'Expense', 2],
        callback,
      );
    });
  });

  // =====================================================
  // deleteCategory
  // =====================================================
  describe('deleteCategory', () => {
    it('should execute delete category query', () => {
      const callback = jest.fn();

      const data = {
        category_id: 3,
      };

      model.deleteCategory(data, callback);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM categories'),
        [3],
        callback,
      );
    });
  });

  // =====================================================
  // Callback behaviour tests
  // =====================================================
  describe('Database callback handling', () => {
    it('should pass successful query result to callback', () => {
      const callback = jest.fn();

      pool.query.mockImplementation((sql, values, cb) => {
        cb(null, {
          rows: [
            {
              category_id: 1,
              category_name: 'Food',
            },
          ],
        });
      });

      model.selectCategory({ category_id: 1 }, callback);

      expect(callback).toHaveBeenCalledWith(null, {
        rows: [
          {
            category_id: 1,
            category_name: 'Food',
          },
        ],
      });
    });

    it('should pass database error to callback', () => {
      const callback = jest.fn();

      const error = new Error('Database Error');

      pool.query.mockImplementation((sql, values, cb) => {
        cb(error, null);
      });

      model.deleteCategory({ category_id: 1 }, callback);

      expect(callback).toHaveBeenCalledWith(error, null);
    });
  });
});
