const controller = require('../../../src/controllers/categoriesController');
const model = require('../../../src/models/categoriesModel');

jest.mock('../../../src/models/categoriesModel');

describe('categoriesController Unit Tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
    };

    res = {
      locals: {
        userId: 1,
      },
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  // =====================================================
  // checkCategoryExists
  // =====================================================
  describe('checkCategoryExists', () => {
    it('should return 400 if category_id is missing', () => {
      controller.checkCategoryExists(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error: category_id is undefined',
      });
    });

    it('should check category using params.category_id', () => {
      req.params.category_id = 1;

      model.checkCategoryExists.mockImplementation((data, callback) => {
        callback(null, {
          rows: [{ category_id: 1 }],
        });
      });

      controller.checkCategoryExists(req, res, next);

      expect(model.checkCategoryExists).toHaveBeenCalledWith(
        {
          category_id: 1,
          user_id: 1,
        },
        expect.any(Function),
      );

      expect(next).toHaveBeenCalled();
    });

    it('should check category using body.category_id fallback', () => {
      req.body.category_id = 2;

      model.checkCategoryExists.mockImplementation((data, callback) => {
        callback(null, {
          rows: [{ category_id: 2 }],
        });
      });

      controller.checkCategoryExists(req, res, next);

      expect(model.checkCategoryExists).toHaveBeenCalledWith(
        {
          category_id: 2,
          user_id: 1,
        },
        expect.any(Function),
      );

      expect(next).toHaveBeenCalled();
    });

    it('should return 404 if category does not exist', () => {
      req.params.category_id = 99;

      model.checkCategoryExists.mockImplementation((data, callback) => {
        callback(null, {
          rows: [],
        });
      });

      controller.checkCategoryExists(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Category Not Found.',
      });
    });

    it('should return 500 if database error occurs', () => {
      req.params.category_id = 1;

      model.checkCategoryExists.mockImplementation((data, callback) => {
        callback(new Error('DB Error'), null);
      });

      controller.checkCategoryExists(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });
  });

  // =====================================================
  // getAllCategories
  // =====================================================
  describe('getAllCategories', () => {
    it('should return all categories successfully', () => {
      const categories = [
        {
          category_id: 1,
          category_name: 'Food',
        },
      ];

      model.selectAll.mockImplementation((callback) => {
        callback(null, categories);
      });

      controller.getAllCategories(req, res, next);

      expect(model.selectAll).toHaveBeenCalledWith(expect.any(Function));

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(categories);
    });

    it('should return 500 when selectAll fails', () => {
      model.selectAll.mockImplementation((callback) => {
        callback(new Error('DB Error'), null);
      });

      controller.getAllCategories(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal Server Error',
      });
    });
  });

  // =====================================================
  // getCategoryById
  // =====================================================
  describe('getCategoryById', () => {
    it('should get category using params.category_id', () => {
      req.params.category_id = 1;

      const category = {
        category_id: 1,
        category_name: 'Food',
      };

      model.selectCategory.mockImplementation((data, callback) => {
        callback(null, {
          rows: [category],
        });
      });

      controller.getCategoryById(req, res, next);

      expect(model.selectCategory).toHaveBeenCalledWith(
        {
          category_id: 1,
        },
        expect.any(Function),
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(category);
    });

    it('should get category using body.category_id fallback', () => {
      req.body.category_id = 5;

      const category = {
        category_id: 5,
        category_name: 'Transport',
      };

      model.selectCategory.mockImplementation((data, callback) => {
        callback(null, {
          rows: [category],
        });
      });

      controller.getCategoryById(req, res, next);

      expect(model.selectCategory).toHaveBeenCalledWith(
        {
          category_id: 5,
        },
        expect.any(Function),
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(category);
    });

    it('should return 404 if category not found', () => {
      req.params.category_id = 100;

      model.selectCategory.mockImplementation((data, callback) => {
        callback(null, {
          rows: [],
        });
      });

      controller.getCategoryById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Category not found',
      });
    });

    it('should return 500 on database error', () => {
      req.params.category_id = 1;

      const error = new Error('DB Error');

      model.selectCategory.mockImplementation((data, callback) => {
        callback(error, null);
      });

      controller.getCategoryById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(error);
    });
  });

  // =====================================================
  // createCategory
  // =====================================================
  describe('createCategory', () => {
    it('should return 400 if required data missing', () => {
      controller.createCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Missing required data.',
      });
    });

    it('should create category successfully', () => {
      req.body = {
        category_name: 'Food',
        category_type: 'Expense',
      };

      model.insertCategory.mockImplementation((data, callback) => {
        callback(null, {
          rows: [
            {
              category_id: 1,
            },
          ],
        });
      });

      controller.createCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        category_id: 1,
        category_name: 'Food',
        category_type: 'Expense',
      });
    });

    it('should return 500 if create fails', () => {
      req.body = {
        category_name: 'Food',
        category_type: 'Expense',
      };

      model.insertCategory.mockImplementation((data, callback) => {
        callback(new Error('DB Error'), null);
      });

      controller.createCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =====================================================
  // updateCategory
  // =====================================================
  describe('updateCategory', () => {
    it('should return 400 if fields missing', () => {
      controller.updateCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should update category successfully', () => {
      req.params.category_id = 1;

      req.body = {
        category_name: 'Food',
        category_type: 'Expense',
      };

      model.updateCategory.mockImplementation((data, callback) => {
        callback(null, {
          rowCount: 1,
        });
      });

      controller.updateCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Category updated successfully',
      });
    });

    it('should return 404 if category does not exist', () => {
      req.params.category_id = 1;

      req.body = {
        category_name: 'Food',
        category_type: 'Expense',
      };

      model.updateCategory.mockImplementation((data, callback) => {
        callback(null, {
          rowCount: 0,
        });
      });

      controller.updateCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on update error', () => {
      req.body = {
        category_name: 'Food',
        category_type: 'Expense',
      };

      model.updateCategory.mockImplementation((data, callback) => {
        callback(new Error('DB Error'), null);
      });

      controller.updateCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =====================================================
  // deleteCategory
  // =====================================================
  describe('deleteCategory', () => {
    it('should delete category successfully', () => {
      req.params.category_id = 1;

      model.deleteCategory.mockImplementation((data, callback) => {
        callback(null, {
          rowCount: 1,
        });
      });

      controller.deleteCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should return 404 if category not found', () => {
      req.params.category_id = 1;

      model.deleteCategory.mockImplementation((data, callback) => {
        callback(null, {
          rowCount: 0,
        });
      });

      controller.deleteCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on delete error', () => {
      model.deleteCategory.mockImplementation((data, callback) => {
        callback(new Error('DB Error'), null);
      });

      controller.deleteCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
