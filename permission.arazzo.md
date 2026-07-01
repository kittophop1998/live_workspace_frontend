arazzo: 1.1.0
info:
  title: Branch Backend Role Permission Workflow
  version: 1.0.0
  description: Logs in and retrieves permissions for the role ID encoded in the returned JWT.
sourceDescriptions:
  - name: branchApi
    url: ../openapi.yaml
    type: openapi
workflows:
  - workflowId: getPermissionsByAuthenticatedRole
    summary: Login and get permissions for the authenticated role
    description: The login response supplies a JWT containing roleId. The permissions request sends that JWT as a bearer token; the API decodes roleId and queries role_access_assignments without accepting a role ID from the request.
    inputs:
      type: object
      required:
        - username
        - password
      properties:
        username:
          type: string
          minLength: 1
        password:
          type: string
          format: password
          minLength: 1
    steps:
      - stepId: loginUser
        description: Authenticate and obtain a JWT containing the user's roleId.
        operationId: login
        requestBody:
          contentType: application/json
          payload:
            username: $inputs.username
            password: $inputs.password
        successCriteria:
          - condition: $statusCode == 200
          - condition: $response.body#/code == "SUCCESS"
        outputs:
          accessToken: $response.body#/data/accessToken
          roleId: $response.body#/data/user/roleId
      - stepId: getRolePermissions
        description: Send the JWT and retrieve permissions assigned to its roleId.
        operationId: getRolePermissions
        parameters:
          - name: Authorization
            in: header
            value: "Bearer {$steps.loginUser.outputs.accessToken}"
        successCriteria:
          - condition: $statusCode == 200
          - condition: $response.body#/code == "SUCCESS"
        outputs:
          permissions: $response.body#/data
    outputs:
      roleId: $steps.loginUser.outputs.roleId
      permissions: $steps.getRolePermissions.outputs.permissions
