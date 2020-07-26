#include <cylinder.hpp>

using namespace rt;

cylinder_t::cylinder_t(material_t *_mat) : start(0.0, 0.0, 0.0), end(0), radius(1.0), mat(_mat) {}
cylinder_t::cylinder_t(material_t *_mat, Eigen::Vector3d _s, Eigen::Vector3d _e, double _r)
    : start(_s), end(_e), radius(_r), mat(_mat){};

cylinder_t::~cylinder_t() {}

bool cylinder_t::intersect(hit_t &result, const ray_t &_ray) const
{
    Vector3d d = _ray.direction;
    Vector3d p0 = _ray.origin;
    Vector3d p_12 = this->end - this->start;
    Vector3d p_10 = p0 - this->start;
    double del2 = p_12.dot(p_12);

    Vector3d avec = p_10 - (p_10.dot(p_12) / del2) * p_12;
    Vector3d bvec = d - (d.dot(p_12) / del2) * p_12;

    double a = bvec.dot(bvec);
    double b = 2 * (avec.dot(bvec));
    double c = avec.dot(avec) - (this->radius * this->radius);

    double disc = b * b - 4 * a * c;
    if (disc >= 0)
    {
        double u1 = (-b - abs(sqrt(disc))) / (2 * a);
        double u2 = (-b + abs(sqrt(disc))) / (2 * a);

        double alpha1 = p_12.dot(p_10 + u1 * d) / del2;
        double alpha2 = p_12.dot(p_10 + u2 * d) / del2;

        if (alpha1 <= 1 && alpha1 >= 0)
        {
            // outside surface intersection
            result = hit_t(this, u1);
            return true;
        }
        else if (alpha2 <= 1 && alpha2 >= 0)
        {
            // inside surface intersection
            result = hit_t(this, u2);
            return true;
        }
        else
        {
            return false;
        }
    }
    else
    {
        return false;
    }
}

Eigen::Vector3d cylinder_t::get_normal(Eigen::Vector3d &_p) const
{
    Vector3d delta_p = this->end - this->start;
    double t = ((_p - this->start).dot(delta_p)) / (delta_p.dot(delta_p));
    Vector3d p_axis = this->start + t * delta_p;
    Vector3d normal = _p - p_axis;
    normal.normalize();
    return normal;
}

material_t *cylinder_t::get_material(void) const
{
    return mat;
}

bool cylinder_t::inside(Eigen::Vector3d &pt) const
{
    return true;
}
void cylinder_t::print(std::ostream &stream) const
{
    Eigen::IOFormat CommaInitFmt(Eigen::StreamPrecision, Eigen::DontAlignCols, ", ", ", ", "", "", "[ ", " ]");

    stream << "Object Properties: -------------------------------" << std::endl;
    stream << "Type: cylinder" << std::endl;
    stream << "Start: " << start.format(CommaInitFmt) << std::endl;
    stream << "End: " << end.format(CommaInitFmt) << std::endl;
    stream << "Radius: " << radius << std::endl
           << std::endl;
}

double cylinder_t::get_tex_u(Vector3d &pt) const
{
    return 0;
}

double cylinder_t::get_tex_v(Vector3d &pt) const
{
    return 0;
}
