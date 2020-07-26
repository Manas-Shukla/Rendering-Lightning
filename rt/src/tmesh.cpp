#include <tmesh.hpp>
#include <fstream>

using namespace rt;
#define dbg(i) std::cout << (i) << std::endl;

tmesh_t::tmesh_t(material_t *_mat, std::string fname)
{
    this->mat = _mat;
    std::fstream obj_file;
    obj_file.open(fname.c_str(), std::ios::out | std::ios::in);
    // not that we assume file format is correct
    // => no err handling for that
    if (obj_file.is_open())
    {
        char type;
        while (obj_file >> type)
        {   
            if (type == 'v')
            {
                // vertex
                double x, y, z;
                obj_file >> x >> y >> z;
                vertices.push_back(Vector3d(x, y, z));
            }
            else if (type == 'f')
            {
                // faces
                int i, j, k;
                // vertices are in anti-clockwise order
                obj_file >> i >> j >> k;
                // convert to 0 based index and push to faces
                faces.push_back(Vector3i(i - 1, j - 1, k - 1));
            }
        }
        // done reading
        obj_file.close();
        // precompute normals here
        for (unsigned int i = 0; i < faces.size(); i++)
        {
            Vector3d ab = vertices[faces[i][0]] - vertices[faces[i][1]];
            Vector3d cb = vertices[faces[i][2]] - vertices[faces[i][1]];
            Vector3d area_vec = cb.cross(ab);
            area_vec.normalize();
            normals.push_back(area_vec);
        }
        
    }
    else
    {
        std::cerr << "err: file " << fname << " not found !\n";
        exit(1);
    }
}

tmesh_t::~tmesh_t()
{
    vertices.clear();
    faces.clear();
}

bool tmesh_t::intersect(hit_t &result, const ray_t &_ray) const
{
    bool found = false;
    double tmin = 1e18;
    for (unsigned int i = 0; i < faces.size(); i++)
    {
        // check ray plane intersection
        double den = _ray.direction.dot(normals[i]);
        if (!is_zero(den))
        {
            double t = (normals[i].dot(vertices[faces[i][0]] - _ray.origin)) / den;
            if (t >= 0 && t <= _ray.maxt && t >= _ray.mint)
            {
                // found plane intersection
                // check for triangle containment
                Vector3d pt = _ray.origin + t * _ray.direction;
                Vector3d a = vertices[faces[i][0]];
                Vector3d b = vertices[faces[i][1]];
                Vector3d c = vertices[faces[i][2]];
                double A, A1, A2, A3;
                A = ((a - b).cross(c - b)).norm();
                A1 = ((a - pt).cross(c - pt)).norm();
                A2 = ((a - pt).cross(b - pt)).norm();
                A3 = ((b - pt).cross(c - pt)).norm();
                double u = A1 / A, v = A2 / A, w = A3 / A;
                if (is_zero(u + v + w - 1) && u >= 0 && v >= 0 && w >= 0)
                {
                    found = true;
                    tmin = std::min(tmin, t);
                }
            }
        }
    }
    if (found)
    {
        result = hit_t(this, tmin);
    }
    return found;
}

Eigen::Vector3d tmesh_t::get_normal(Eigen::Vector3d &pt) const
{
    for (unsigned int i = 0; i < faces.size(); i++)
    {
        Vector3d a = vertices[faces[i][0]];
        Vector3d b = vertices[faces[i][1]];
        Vector3d c = vertices[faces[i][2]];
        double A, A1, A2, A3;
        A = ((a - b).cross(c - b)).norm();
        A1 = ((a - pt).cross(c - pt)).norm();
        A2 = ((a - pt).cross(b - pt)).norm();
        A3 = ((b - pt).cross(c - pt)).norm();   
        double u = A1 / A, v = A2 / A, w = A3 / A;
        if (is_zero(u + v + w - 1) && u >= 0 && v >= 0 && w >= 0)
        {
            return normals[i];
        }
    }
    return Vector3d(0);
}

material_t *tmesh_t::get_material(void) const
{
    return mat;
}

bool tmesh_t::inside(Eigen::Vector3d &pt) const
{
    return false;
}
void tmesh_t::print(std::ostream &stream) const
{
    Eigen::IOFormat CommaInitFmt(Eigen::StreamPrecision, Eigen::DontAlignCols, ", ", ", ", "", "", "[ ", " ]");

    stream << "Object Properties: -------------------------------" << std::endl;
    stream << "Type: Triangle Mesh" << std::endl;
    stream << "Vertices\n";
    for(unsigned int i=0;i<vertices.size();i++) {
        stream << vertices[i][0] << " " << vertices[i][1] <<" "<< vertices[i][2] << std::endl;
    }
    for(unsigned int i=0;i<faces.size();i++) {
        stream << "face => " << i << '\n';
        stream << vertices[faces[i][0]][0] << " " << vertices[faces[i][0]][1] << " " << vertices[faces[i][0]][2] << std::endl;
        stream << vertices[faces[i][1]][0] << " " << vertices[faces[i][1]][1] << " " << vertices[faces[i][1]][2] << std::endl;
        stream << vertices[faces[i][2]][0] << " " << vertices[faces[i][2]][1] << " " << vertices[faces[i][2]][2] << std::endl;
    }
}

double tmesh_t::get_tex_u(Vector3d &pt) const
{
    // currently mesh does not support texture
    return 0;
}

double tmesh_t::get_tex_v(Vector3d &pt) const
{
    // currently mesh does not support texture
    return 0;
}
